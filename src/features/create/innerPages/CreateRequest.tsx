import styled from '@emotion/styled';
import axios from 'axios';
import Spinner from '@/features/create/components/Spinner';
import Spacer from '@/shared/components/Spacer';
import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Complete from '@/features/create/components/Complete';
import api from '@/shared/api/axiosClient';
import type { QuestionType } from '@/features/create/constants/questionTypeConstants';
import { QUESTION_TYPE_MAP } from '@/features/create/constants/questionTypeConstants';

const QUESTION_SET_POLL_INTERVAL_MS = 2_000;
const QUESTION_SET_CREATION_TIMEOUT_MS = 5 * 60 * 1_000;
const QUESTION_SET_PENDING_CODE = 'QSE_002';

interface ProblemDetail {
  code?: string;
}

const getQuestionSetIdFromLocation = (location: string | undefined): number => {
  const match = location?.match(/\/question-set\/(\d+)(?:[/?#]|$)/);
  const id = match ? Number(match[1]) : Number.NaN;

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error('생성된 문제집 번호를 확인할 수 없습니다.');
  }

  return id;
};

const wait = (milliseconds: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(resolve, milliseconds);

    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timeoutId);
        reject(new DOMException('요청이 취소되었습니다.', 'AbortError'));
      },
      { once: true },
    );
  });

const waitForQuestionSet = async (questionSetId: number, signal: AbortSignal): Promise<void> => {
  const deadline = Date.now() + QUESTION_SET_CREATION_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      await api.get(`/question-set/${questionSetId}`, { signal });
      return;
    } catch (error: unknown) {
      if (signal.aborted) {
        throw error;
      }

      const isPending =
        axios.isAxiosError<ProblemDetail>(error) &&
        error.response?.data?.code === QUESTION_SET_PENDING_CODE;

      if (!isPending) {
        throw error;
      }
    }

    await wait(QUESTION_SET_POLL_INTERVAL_MS, signal);
  }

  throw new Error('문제 생성 시간이 오래 걸리고 있습니다. 나의 문제집에서 상태를 확인해 주세요.');
};

interface CreateRequestProps {
  selectedFile: { id: string; name: string | null } | null;
  onReset: () => void;
  questionSetReady: boolean;
  questionSetId: number;
  setQuestionSetId: (id: number) => void;
  setQuestionSetReady: (isReady: boolean) => void;
  questionType: QuestionType | null;
}

const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
`;

const NoticeTitle = styled.h3`
  width: 100%;
  text-align: center;
  font-size: ${({ theme }) => theme.typography.title1Bold.fontSize};
`;

const NoticeContent = styled.p`
  width: 100%;
  padding: 10px;
  text-align: center;
`;

const NoticeContentHighlight = styled.span`
  color: ${({ theme }) => theme.colors.semantic.primary};
  font-weight: ${({ theme }) => theme.typography.body1Bold.fontWeight};
`;

const ErrorMessage = styled.p`
  color: red;
  margin-top: 20px;
  text-align: center;
`;

const RetryButton = styled.button`
  margin-top: 20px;
  padding: 10px 20px;
  background-color: ${({ theme }) => theme.colors.semantic.primary};
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
`;

const ResetButton = styled(RetryButton)`
  background-color: ${({ theme }) => theme.colors.gray.gray5};
`;

const ButtonWrapper = styled.div`
  display: flex;
  gap: 12px;
`;

const NextComponent: React.FC<{
  fileName: string | null;
  onReset: () => void;
  questionSetId: number;
  questionType: QuestionType | null;
}> = ({ fileName, onReset, questionSetId, questionType }) => (
  <Container>
    <Complete
      fileName={fileName}
      onReset={onReset}
      questionSetId={questionSetId}
      questionType={questionType}
    />
  </Container>
);

const CreateRequest: React.FC<CreateRequestProps> = ({
  selectedFile,
  onReset,
  questionSetReady,
  questionSetId,
  setQuestionSetId,
  setQuestionSetReady,
  questionType,
}) => {
  const [status, setStatus] = useState<'requesting' | 'error'>('requesting');
  const [error, setError] = useState<string | null>(null);
  const requestSent = useRef(false);
  const pollingAbortController = useRef<AbortController | null>(null);
  const [idempotencyKey] = useState(() => uuidv4());

  const createQuestionSet = useCallback(async () => {
    if (!selectedFile || !questionType) return;

    setQuestionSetId(0);
    setQuestionSetReady(false);
    setStatus('requesting');
    setError(null);

    pollingAbortController.current?.abort();
    const abortController = new AbortController();
    pollingAbortController.current = abortController;

    try {
      const response = await api.post(
        '/question-set',
        {
          title: selectedFile.name,
          difficulty: 'EASY',
          questionCount: 10,
          type: questionType,
          sourceIds: [parseInt(selectedFile.id)],
        },
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        },
      );

      const locationHeader = response.headers.location;
      const createdQuestionSetId = getQuestionSetIdFromLocation(
        typeof locationHeader === 'string' ? locationHeader : undefined,
      );

      setQuestionSetId(createdQuestionSetId);
      await waitForQuestionSet(createdQuestionSetId, abortController.signal);

      if (!abortController.signal.aborted) {
        setQuestionSetReady(true);
      }
    } catch (err: unknown) {
      if (abortController.signal.aborted) {
        return;
      }

      if (err instanceof Error) {
        setError(`문제집 생성 중 오류: ${err.message}`);
      } else {
        setError('문제집 생성 중 알 수 없는 오류가 발생했습니다.');
      }
      setStatus('error');
    }
  }, [selectedFile, questionType, setQuestionSetId, setQuestionSetReady, idempotencyKey]);

  useEffect(() => {
    if (requestSent.current) {
      return;
    }
    requestSent.current = true;
    createQuestionSet();
  }, [createQuestionSet]);

  useEffect(
    () => () => {
      pollingAbortController.current?.abort();
    },
    [],
  );

  if (questionSetReady) {
    return (
      <NextComponent
        fileName={selectedFile?.name ?? null}
        onReset={onReset}
        questionSetId={questionSetId}
        questionType={questionType}
      />
    );
  }

  if (status === 'error') {
    return (
      <Container>
        <NoticeTitle>문제 생성 중 오류가 발생했습니다.</NoticeTitle>
        <ErrorMessage>{error}</ErrorMessage>
        <Spacer height="20px" />
        <ButtonWrapper>
          <RetryButton onClick={createQuestionSet}>재시도</RetryButton>
          <ResetButton onClick={onReset}>처음으로 돌아가기</ResetButton>
        </ButtonWrapper>
      </Container>
    );
  }

  return (
    <Container>
      <Spinner />
      <Spacer height="25px" />
      <NoticeTitle>AI가 문제를 생성하고 있습니다</NoticeTitle>
      <NoticeContent>
        선택하신 PDF에서 <NoticeContentHighlight>10개</NoticeContentHighlight>의{' '}
        <NoticeContentHighlight>
          {questionType ? QUESTION_TYPE_MAP.get(questionType)?.title : '알 수 없음'}
        </NoticeContentHighlight>{' '}
        문제를 생성하고 있어요
      </NoticeContent>
    </Container>
  );
};

export default CreateRequest;
