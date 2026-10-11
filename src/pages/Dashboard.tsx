// External libraries
import styled from '@emotion/styled';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, CheckCircle, Target, Flame } from 'lucide-react';

// Auth
import { useAuth } from '@/app/auth/useAuth';

// Feature components & types
import CalendarHeatmapCompo from '@/features/dashboard/components/CalendarHeatmapCompo';
import StatsCard from '@/features/dashboard/components/StatsCard';
import type { LearnStatsResponse } from '@/features/dashboard/types/learnStats';
import type { DailyStatsResponse } from '@/features/dashboard/types/dailyStats';
import type { QuestionSetContentType } from '@/features/library/types/questionSetResponse';

// Shared components & utils
import api from '@/shared/api/axiosClient';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background-color: ${({ theme }) => theme.colors.background.background};
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
  justify-content: flex-start;
`;

const DashboardWrapper = styled.div`
  width: 100%;
  max-width: 1400px;
  padding: ${({ theme }) => theme.spacing.spacing5};
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
  justify-content: flex-start;

  @media (max-width: 1050px), (max-height: 400px) {
    max-width: 100%;
    padding: ${({ theme }) => theme.spacing.spacing3};
    overflow-x: hidden;
  }
`;

const DashboardTitle = styled.h1`
  width: 100%;
  font-size: ${({ theme }) => theme.typography.title1Bold.fontSize};
  font-weight: ${({ theme }) => theme.typography.title1Bold.fontWeight};
  line-height: ${({ theme }) => theme.typography.title1Bold.lineHeight};
  text-align: left;
  margin-bottom: 5px;
`;

const DashboardDescription = styled.p`
  display: block;
  width: 100%;
  font-size: ${({ theme }) => theme.typography.subtitle2Regular.fontSize};
  font-weight: ${({ theme }) => theme.typography.subtitle2Regular.fontWeight};
  line-height: ${({ theme }) => theme.typography.subtitle2Regular.lineHeight};
  color: ${({ theme }) => theme.colors.gray.gray6};
  text-align: left;
`;

const DashboardStatCardWrapper = styled.div`
  display: flex;
  margin-top: ${({ theme }) => theme.spacing.spacing5};
  justify-content: space-between;

  @media (max-width: 1050px), (max-height: 400px) {
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.spacing.spacing3};
  }
`;

const StudyFlowWrapper = styled.section`
  width: 100%;
  margin-top: ${({ theme }) => theme.spacing.spacing6};
  background-color: ${({ theme }) => theme.colors.gray.gray0};
  border-radius: ${({ theme }) => theme.radius.radius3};
  box-shadow: 1px 1px 1px rgba(0, 0, 0, 0.1);
  padding: ${({ theme }) => theme.spacing.spacing5};
`;

const StudyFlowHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.spacing3};
  align-items: flex-start;

  @media (max-width: 1050px), (max-height: 400px) {
    flex-direction: column;
  }
`;

const StudyFlowTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.body1Bold.fontSize};
  font-weight: ${({ theme }) => theme.typography.body1Bold.fontWeight};
  line-height: ${({ theme }) => theme.typography.body1Bold.lineHeight};
  color: ${({ theme }) => theme.colors.gray.gray8};
`;

const StudyFlowDescription = styled.p`
  margin-top: ${({ theme }) => theme.spacing.spacing1};
  font-size: ${({ theme }) => theme.typography.label1Regular.fontSize};
  line-height: ${({ theme }) => theme.typography.label1Regular.lineHeight};
  color: ${({ theme }) => theme.colors.gray.gray6};
`;

const StudySummary = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.spacing4};
  color: ${({ theme }) => theme.colors.gray.gray7};
  font-size: ${({ theme }) => theme.typography.label1Regular.fontSize};
  white-space: nowrap;
`;

const StudyFlowList = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing.spacing3};
  margin-top: ${({ theme }) => theme.spacing.spacing4};

  @media (max-width: 1050px), (max-height: 400px) {
    grid-template-columns: 1fr;
  }
`;

const StudyFlowCard = styled.article`
  border: 1px solid ${({ theme }) => theme.colors.gray.gray2};
  border-radius: ${({ theme }) => theme.radius.radius2};
  padding: ${({ theme }) => theme.spacing.spacing4};
  background-color: ${({ theme }) => theme.colors.background.background};
`;

const StudyFlowCardTitle = styled.h3`
  display: -webkit-box;
  overflow: hidden;
  min-height: 44px;
  color: ${({ theme }) => theme.colors.gray.gray8};
  font-size: ${({ theme }) => theme.typography.subtitle2Bold.fontSize};
  font-weight: ${({ theme }) => theme.typography.subtitle2Bold.fontWeight};
  line-height: ${({ theme }) => theme.typography.subtitle2Bold.lineHeight};
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const StudyFlowMeta = styled.p`
  margin-top: ${({ theme }) => theme.spacing.spacing2};
  color: ${({ theme }) => theme.colors.gray.gray6};
  font-size: ${({ theme }) => theme.typography.label1Regular.fontSize};
  line-height: ${({ theme }) => theme.typography.label1Regular.lineHeight};
`;

const StudyFlowBadge = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  margin-top: ${({ theme }) => theme.spacing.spacing3};
  padding: 0 ${({ theme }) => theme.spacing.spacing3};
  border-radius: ${({ theme }) => theme.radius.radius2};
  background-color: ${({ theme }) => theme.colors.gray.gray2};
  color: ${({ theme }) => theme.colors.gray.gray8};
  font-size: ${({ theme }) => theme.typography.label1Bold.fontSize};
  font-weight: ${({ theme }) => theme.typography.label1Bold.fontWeight};
`;

interface QuestionSets {
  content: QuestionSetContentType[];
}

interface QuestionSetApiResponse {
  questionSets: QuestionSets;
}

const STATUS_LABELS = {
  COMPLETE: '문제 풀이 가능',
  PENDING: 'AI 생성 중',
  FAILED: '생성 실패',
  UNPROCESSABLE: '처리 불가',
} as const;

const LEARNING_STATUS_LABELS = {
  NOT_STARTED: '풀이 전',
  IN_PROGRESS: '풀이 진행 중',
  COMPLETED: '풀이 완료',
} as const;

function Dashboard() {
  const { userInfo, isAuthLoading } = useAuth();
  const memberId = userInfo?.id;

  const { data } = useQuery<LearnStatsResponse>({
    queryKey: ['learnStats', memberId],
    queryFn: async () => {
      const res = await api.get<LearnStatsResponse>(`/members/${memberId}/learn-stats`);
      return res.data;
    },
    enabled: !!memberId && !isAuthLoading,
  });

  const today = new Date();
  const toYear = today.getFullYear();
  const toMonth = String(today.getMonth() + 1).padStart(2, '0');
  const toDay = String(today.getDate()).padStart(2, '0');
  const to = `${toYear}-${toMonth}-${toDay}`;

  const fromDate = new Date(today);
  fromDate.setFullYear(fromDate.getFullYear() - 1);
  const fromYear = fromDate.getFullYear();
  const fromMonth = String(fromDate.getMonth() + 1).padStart(2, '0');
  const fromDay = String(fromDate.getDate()).padStart(2, '0');
  const from = `${fromYear}-${fromMonth}-${fromDay}`;

  const { data: dailyValues } = useQuery<DailyStatsResponse>({
    queryKey: ['dailyStatsValues', memberId, from, to],
    queryFn: async () => {
      if (!memberId) return [] as DailyStatsResponse;
      const res = await api.get<DailyStatsResponse>(
        `/members/${memberId}/daily-stats?from=${from}&to=${to}`,
      );
      return res.data;
    },
    enabled: !!memberId && !isAuthLoading,
  });

  const { data: questionSetData } = useQuery<QuestionSetApiResponse>({
    queryKey: ['dashboardQuestionSets', memberId],
    queryFn: async () => {
      const res = await api.get<QuestionSetApiResponse>('/question-set?size=6');
      return res.data;
    },
    enabled: !!memberId && !isAuthLoading,
    refetchInterval: (query) =>
      query.state.data?.questionSets.content.some((item) => item.status === 'PENDING')
        ? 5000
        : false,
  });

  const recentQuestionSets = questionSetData?.questionSets.content.slice(0, 3) ?? [];
  const readyQuestionSetCount =
    questionSetData?.questionSets.content.filter((item) => item.status === 'COMPLETE').length ?? 0;
  const studyingQuestionSetCount =
    questionSetData?.questionSets.content.filter((item) => item.learningStatus === 'IN_PROGRESS')
      .length ?? 0;

  const statsCards = [
    {
      icon: BookOpen,
      count: data?.totalQuestionSetCount ?? 0,
      description: '총 문제집 수',
      bgColor: '#dbeafe',
      iconColor: '#3b82f6',
    },
    {
      icon: CheckCircle,
      count: data?.weeklySolvedQuestionCount ?? 0,
      description: '이번 주 푼 문제',
      bgColor: '#dcfce7',
      iconColor: '#22c55e',
    },
    {
      icon: Target,
      count: data?.totalSolvedQuestionCount ?? 0,
      description: '총 푼 문제수',
      bgColor: '#f3f4f6',
      iconColor: '#a855f7',
    },
    {
      icon: Flame,
      count: data?.consecutiveLearningDays ?? 0,
      description: '연속 학습일',
      bgColor: '#fee2e2',
      iconColor: '#f97316',
    },
  ];

  return (
    <Container>
      <DashboardWrapper>
        <DashboardTitle>학습 현황</DashboardTitle>
        <DashboardDescription>오늘도 열심히 공부하고 계시네요! 📚</DashboardDescription>
        <DashboardStatCardWrapper>
          {statsCards.map((card, index) => (
            <StatsCard
              key={index}
              icon={card.icon}
              count={card.count}
              description={card.description}
              bgColor={card.bgColor}
              iconColor={card.iconColor}
            />
          ))}
        </DashboardStatCardWrapper>
        <StudyFlowWrapper>
          <StudyFlowHeader>
            <div>
              <StudyFlowTitle>최근 학습 흐름</StudyFlowTitle>
              <StudyFlowDescription>
                PDF가 문제집으로 생성되고, 생성된 문제집이 풀이 상태로 이어지는 과정을 확인할 수
                있습니다.
              </StudyFlowDescription>
            </div>
            <StudySummary>
              <span>풀이 가능 {readyQuestionSetCount}개</span>
              <span>진행 중 {studyingQuestionSetCount}개</span>
            </StudySummary>
          </StudyFlowHeader>
          <StudyFlowList>
            {recentQuestionSets.map((item) => (
              <StudyFlowCard key={item.questionSetId}>
                <StudyFlowCardTitle>{item.title}</StudyFlowCardTitle>
                <StudyFlowMeta>
                  {item.questionCount}문제 · {LEARNING_STATUS_LABELS[item.learningStatus]}
                </StudyFlowMeta>
                <StudyFlowBadge>{STATUS_LABELS[item.status]}</StudyFlowBadge>
              </StudyFlowCard>
            ))}
          </StudyFlowList>
        </StudyFlowWrapper>
        <CalendarHeatmapCompo values={dailyValues ?? []} startDate={from} endDate={to} />
      </DashboardWrapper>
    </Container>
  );
}

export default Dashboard;
