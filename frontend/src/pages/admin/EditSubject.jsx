import React from 'react';
import { useParams } from 'react-router-dom';
import SubjectForm from '../../components/forms/SubjectForm';

export default function EditSubject() {
  const { id } = useParams();
  
  return <SubjectForm subjectId={id} />;
}
