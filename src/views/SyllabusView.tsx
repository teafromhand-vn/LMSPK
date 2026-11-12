import { useMemo, useState, type ReactNode } from 'react';
import { CalendarDays, ClipboardList, Download, GraduationCap, Info, Library, Users } from 'lucide-react';
import { Screen } from '../components/Screen';
import { Notice } from '../components/Notice';
import { useAsync } from '../hooks/useAsync';
import { loadCatalog, loadSyllabus } from '../lib/content';
import { classifyContentError } from '../lib/errors';

export function SyllabusView() {
  const { data: catalog, error: catalogError, reload: reloadCatalog } = useAsync(loadCatalog, []);
  const { data: syllabus, error, reload } = useAsync(loadSyllabus, []);
  const loadError = error ?? catalogError;
  const subjects = catalog ?? [];
  const [selectedId, setSelectedId] = useState('');
  const selected = useMemo(() => syllabus?.find((item) => item.subjectId === (selectedId || syllabus[0]?.subjectId)), [selectedId, syllabus]);
  const selectedContent = subjects.find((item) => item.subject.id === selected?.subjectId);

  return (
    <Screen path={['syllabus']} title="Syllabus">
      <div className="syllabus-hero">
        <div>
          <p className="page-kicker"><span className="tiny-line" /> COURSE INFORMATION</p>
          <h1>Syllabus</h1>
          <p>Thông tin chi tiết về mục tiêu, nội dung, tài liệu và đánh giá của từng môn học.</p>
        </div>
        <GraduationCap size={62} strokeWidth={1.25} />
      </div>

      {!!loadError && <Notice title="Không thể tải syllabus." tone="error"><p>{classifyContentError(loadError)}</p><button className="btn" onClick={error ? reload : reloadCatalog}>Thử lại</button></Notice>}
      {!loadError && !syllabus && <p role="status">Đang tải syllabus…</p>}
      {selected && selectedContent && (
        <>
          <div className="syllabus-toolbar">
            <label htmlFor="syllabus-course">Chọn môn học</label>
            <select id="syllabus-course" value={selected.subjectId} onChange={(event) => setSelectedId(event.target.value)}>
              {(syllabus ?? []).map((item) => <option value={item.subjectId} key={item.subjectId}>{item.subjectCode} · {item.courseName}</option>)}
            </select>
            <button className="btn syllabus-download" type="button"><Download size={16} /> Tải syllabus</button>
          </div>

          <section className="syllabus-card syllabus-overview">
            <div className="syllabus-card-title"><Info size={18} /><h2>Syllabus Details</h2></div>
            <div className="syllabus-details">
              <div><span>Syllabus ID</span><strong>{selected.syllabusId}</strong></div><div><span>Syllabus Name</span><strong>{selected.syllabusName}</strong></div><div><span>Course Name</span><strong>{selected.courseName}</strong></div><div><span>Subject Code</span><strong>{selected.subjectCode}</strong></div><div><span>Course Name English</span><strong>{selected.courseNameEnglish}</strong></div><div><span>Teaching-learning method</span><strong>{selected.teachingLearningMethod}</strong></div><div><span>No. credit</span><strong>{selected.noCredit}</strong></div><div><span>Degree</span><strong>{selected.degree}</strong></div><div><span>Time allocation</span><strong>{selected.timeAllocation}</strong></div><div><span>Pre-requisite</span><strong>{selected.prerequisite}</strong></div><div className="syllabus-description"><span>Description</span><p>{selected.description}</p></div><div className="syllabus-description"><span>Student tasks</span><p>{selected.studentTasks}</p></div><div className="syllabus-description"><span>Tools</span><p>{selected.tools}</p></div><div><span>Scoring scale</span><strong>{selected.scoringScale}</strong></div><div><span>Decision no.</span><strong>{selected.decisionNo}</strong></div><div><span>Approved date</span><strong>{selected.approvedDate}</strong></div>
            </div>
          </section>

          <div className="syllabus-grid">
            <SyllabusTable icon={<Library size={18} />} title={`Materials (${selectedContent.documents.length})`} columns={['No.', 'Material description', 'Format']} rows={selectedContent.documents.map((doc, index) => [String(index + 1), doc.name, doc.format.toUpperCase()])} />
            <SyllabusTable icon={<ClipboardList size={18} />} title={`Collections (${selectedContent.tests.length + selectedContent.flashcards.length})`} columns={['No.', 'Collection', 'Type']} rows={[...selectedContent.flashcards.map((item) => [item.id, item.name, 'Flashcards']), ...selectedContent.tests.map((item) => [item.id, item.name, 'Tests'])]} />
          </div>
          <section className="syllabus-card syllabus-sessions"><div className="syllabus-card-title"><CalendarDays size={18} /><h2>Student tasks</h2></div><p className="syllabus-longtext">{selected.studentTasks}</p></section>
          <section className="syllabus-card syllabus-summary"><Users size={20} /><div><h2>Assessment summary</h2><p>{selected.scoringScale}</p></div></section>
        </>
      )}
    </Screen>
  );
}

function SyllabusTable({ icon, title, columns, rows }: { icon: ReactNode; title: string; columns: string[]; rows: string[][] }) {
  return <section className="syllabus-card syllabus-table-card"><div className="syllabus-card-title">{icon}<h2>{title}</h2></div><div className="table-scroll"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div></section>;
}
