import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import ResourcePage from './ResourcePage';
import { usePlatform } from '../PlatformContext';
import {
  studentConfig, teacherConfig, classConfig, subjectConfig, assessmentConfig,
  diaryConfig, lessonPlanConfig
} from '../resourceConfigs';
import { Button } from '../ui';

export const StudentsPage = () => {
  const { t } = usePlatform();
  return <ResourcePage {...studentConfig(t)} />;
};

export const TeachersPage = () => {
  const { t } = usePlatform();
  return <ResourcePage {...teacherConfig(t)} />;
};

export const ClassesPage = () => {
  const { t } = usePlatform();
  return <ResourcePage {...classConfig(t)} />;
};

export const SubjectsPage = () => {
  const { t } = usePlatform();
  return <ResourcePage {...subjectConfig(t)} />;
};

export const AssessmentPage = () => {
  const { t } = usePlatform();
  return <ResourcePage {...assessmentConfig(t)} />;
};

export const DiaryPage = () => {
  const { t } = usePlatform();
  return <ResourcePage {...diaryConfig(t)} />;
};

export const LessonPlannerPage = () => {
  const { t } = usePlatform();
  return (
    <ResourcePage
      {...lessonPlanConfig(t)}
      headerActions={
        <>
          <Link to="/classes" className="pf-btn pf-btn--secondary pf-btn--md">
            {t('planner.open')} <ArrowRight size={15} />
          </Link>
          <Link to="/classes" className="pf-btn pf-btn--primary pf-btn--md">
            <Sparkles size={15} /> {t('planner.generate')}
          </Link>
        </>
      }
    />
  );
};
