import React from 'react';
import SubjectForm from '../../components/forms/SubjectForm';

export default function AddSubject({ onClose, onCreate }) {
  return <SubjectForm onClose={onClose} onCreate={onCreate} />;
}
