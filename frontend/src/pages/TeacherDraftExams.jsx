import React, { useEffect, useState, useMemo } from 'react';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import examService from '../services/examService';
import ExamCard from '../components/ui/ExamCard';
import Button from '../components/ui/Button';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSpinner } from 'react-icons/fa';

// Lightweight teacher draft exams management panel
const TeacherDraftExams = () => {
  const { currentUser } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [refreshFlag, setRefreshFlag] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!currentUser?.school) { toast.error('Missing school context'); setLoading(false); return; }
      setLoading(true);
      try {
        const all = await examService.getTeacherExams(currentUser.school);
        setExams(Array.isArray(all) ? all.filter(e => e.status === 'draft') : []);
      } catch (e) {
        console.error(e);
        toast.error(e.message || 'Failed fetching draft exams');
        setExams([]);
      } finally { setLoading(false); }
    };
    load();
  }, [currentUser, refreshFlag]);

  const filtered = useMemo(() => {
    if (!search.trim()) return exams;
    const q = search.toLowerCase();
    return exams.filter(e => (e.title||'').toLowerCase().includes(q) || (e.subject?.name||'').toLowerCase().includes(q));
  }, [exams, search]);

  const scheduleExam = async (exam) => {
    try {
      if (!currentUser?.school) return toast.error('No school');
      const startInput = window.prompt('Enter start time (YYYY-MM-DDTHH:MM)');
      if (!startInput) return;
      const durationInput = window.prompt('Enter duration in minutes');
      if (!durationInput) return;
      const startISO = new Date(startInput).toISOString();
      const duration = parseInt(durationInput, 10);
      if (isNaN(duration) || duration < 5) return toast.error('Duration invalid (>=5).');
      if (new Date(startISO) <= new Date()) return toast.error('Start must be future');
      await examService.scheduleExam(exam._id, { start: startISO, duration }, currentUser.school);
      toast.success('Exam scheduled');
      // Remove from drafts list (status changes)
      setExams(prev => prev.filter(x => x._id !== exam._id));
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Scheduling failed');
    }
  };

  const activateExam = async (exam) => {
    try {
      if (!currentUser?.school) return toast.error('No school');
      await examService.activateExam(exam._id, currentUser.school);
      toast.success('Exam activated');
      setExams(prev => prev.filter(x => x._id !== exam._id));
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Activation failed');
    }
  };

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: .4, staggerChildren: .05 } } };
  const cardVariants = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: .25 } } };

  return (
    <Layout>
      <motion.div className="" variants={containerVariants} initial="hidden" animate="visible">
        <motion.div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4" variants={cardVariants}>
          <h1 className="text-xl font-bold text-gray-900">Draft Exams</h1>
          <div className="relative px-4 w-full sm:w-64 max-h-8 flex items-center border border-black/25 rounded-lg">
            <input
              className="py-2 w-full text-sm placeholder:text-sm focus:outline-none"
              placeholder="Search drafts..."
              value={search}
              onChange={e=>setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={()=>setRefreshFlag(f=>f+1)}>Refresh</Button>
          </div>
        </motion.div>

        {loading ? (
          <motion.div variants={cardVariants} className="flex justify-center items-center py-16">
            <FaSpinner className="h-10 w-10 animate-spin text-blue-600" />
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div variants={cardVariants} className="text-center py-16 text-gray-600">No draft exams.</motion.div>
        ) : (
          <motion.div className="flex flex-wrap gap-4 py-2" variants={containerVariants}>
            {filtered.map(exam => (
              <motion.div key={exam._id} variants={cardVariants} className="relative">
                <ExamCard
                  examId={exam._id}
                  title={exam.title}
                  subject={exam.subject}
                  classCode={Array.isArray(exam.classes) ? exam.classes.map(c=>c.className||c.level||'').join(', ') : ''}
                  description={exam.instructions}
                  status={exam.status}
                  startTime={exam.schedule?.start}
                  endTime={exam.schedule?.end}
                  questions={exam.questions}
                  totalPoints={exam.questions?.reduce((s,q)=>s + (parseInt(q.maxScore)||0),0)}
                  teacher={exam.teacher}
                  type={exam.type}
                  instructions={exam.instructions}
                  schedule={exam.schedule}
                  onClickOverride={() => { /* open detail if needed */ }}
                />
                <div className="absolute bottom-3 left-6 flex gap-2">
                  <Button size="sm" className="!bg-blue-600 hover:!bg-blue-700 !rounded-md !px-4 !py-1.5 text-[12px]" onClick={()=>scheduleExam(exam)}>Schedule</Button>
                  <Button size="sm" className="!bg-green-600 hover:!bg-green-700 !rounded-md !px-4 !py-1.5 text-[12px]" onClick={()=>activateExam(exam)}>Activate</Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </Layout>
  );
};

export default TeacherDraftExams;
