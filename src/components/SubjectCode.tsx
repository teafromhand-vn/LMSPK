import type { Subject } from '../models/types';
export function SubjectCode({ subject }: { subject: Subject }) {
  return <span className="course-id">{subject.courseId ?? subject.id.toUpperCase()}</span>;
}
