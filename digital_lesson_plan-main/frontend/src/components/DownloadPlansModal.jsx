import React, { useState, useEffect } from 'react';
import { FiDownload, FiCheckSquare, FiSquare, FiFileText, FiArchive } from 'react-icons/fi';
import Modal from './Modal';
import api from '../services/api';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, ShadingType } from 'docx';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

// Helper to parse AI content
const parseAIContent = (content) => {
    try {
        if (!content) return null;
        let jsonStr = content.trim();
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.substring(7);
        else if (jsonStr.startsWith('```')) jsonStr = jsonStr.substring(3);
        if (jsonStr.endsWith('```')) jsonStr = jsonStr.substring(0, jsonStr.length - 3);
        return JSON.parse(jsonStr.trim());
    } catch (e) {
        console.error("Failed to parse AI content:", e);
        return null;
    }
};

const DownloadPlansModal = ({ isOpen, onClose, unitId, unitTitle }) => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlans, setSelectedPlans] = useState([]);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        if (isOpen && unitId) {
            fetchPlans();
        }
    }, [isOpen, unitId]);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/lesson-plans/units/${unitId}/plans`);
            const data = res.data.data || [];
            setPlans(data);
            setSelectedPlans(data.map(p => p.id));
        } catch (error) {
            toast.error('Failed to load lesson plans');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (id) => {
        setSelectedPlans(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        setSelectedPlans(selectedPlans.length === plans.length ? [] : plans.map(p => p.id));
    };

    // Helper to add a single lesson plan to a jsPDF instance
    const addPlanToPDF = (doc, plan, isFirstPage = true) => {
        if (!isFirstPage) doc.addPage();
        const data = parseAIContent(plan.content);
        if (!data) {
            doc.text("Error parsing lesson plan content.", 20, 20);
            return;
        }

        const header = data.header_details || {};
        const phases = data.phases || [];

        // Header Info - Centered prominently
        doc.setFont('times', 'bold');
        doc.setFontSize(14);
        doc.text(`School Name: ${plan.school_name || '-'}        Teacher's name: ${plan.teacher_name || '-'}`, 105, 15, { align: 'center' });

        // Official Table
        autoTable(doc, {
            startY: 30, // More space from school/teacher headers
            theme: 'grid',
            styles: {
                fontSize: 10,
                font: 'times',
                cellPadding: 3.5, // Slightly more padding for airiness
                textColor: '#000000',
                lineColor: '#000000',
                lineWidth: 0.1,
                valign: 'middle' // Center vertically
            },
            columnStyles: {
                0: { cellWidth: 15 }, // Term
                1: { cellWidth: 25 }, // Date
                2: { cellWidth: 18 }, // Subject col span 2 (18+18)
                3: { cellWidth: 18 },
                4: { cellWidth: 18 }, // Class
                5: { cellWidth: 18 }, // Unit N
                6: { cellWidth: 20 }, // Lesson N
                7: { cellWidth: 20 }, // Duration
                8: { cellWidth: 14 }, // Class size col span 2 (14+14)
                9: { cellWidth: 14 }
            },
            headStyles: {
                fillColor: '#f2f2f2',
                textColor: '#000000',
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: {
                valign: 'top'
            },
            body: [
                [
                    { content: 'Term', styles: { fontStyle: 'bold', halign: 'center', fillColor: '#f2f2f2' } },
                    { content: 'Date', styles: { fontStyle: 'bold', halign: 'center', fillColor: '#f2f2f2' } },
                    { content: 'Subject', styles: { fontStyle: 'bold', halign: 'center', fillColor: '#f2f2f2' }, colSpan: 2 },
                    { content: 'Class', styles: { fontStyle: 'bold', halign: 'center', fillColor: '#f2f2f2' } },
                    { content: 'Unit Nº', styles: { fontStyle: 'bold', halign: 'center', fillColor: '#f2f2f2' } },
                    { content: 'Lesson Nº', styles: { fontStyle: 'bold', halign: 'center', fillColor: '#f2f2f2' } },
                    { content: 'Duration', styles: { fontStyle: 'bold', halign: 'center', fillColor: '#f2f2f2' } },
                    { content: 'Class size', styles: { fontStyle: 'bold', halign: 'center', fillColor: '#f2f2f2' }, colSpan: 2 }
                ],
                [
                    { content: plan.term || '-', styles: { halign: 'center' } },
                    { content: plan.teaching_date ? new Date(plan.teaching_date).toLocaleDateString('en-GB') : '-', styles: { halign: 'center' } },
                    { content: plan.subject_name || '-', styles: { halign: 'center' }, colSpan: 2 },
                    { content: plan.class_name || '-', styles: { halign: 'center' } },
                    { content: plan.unit_number || '-', styles: { halign: 'center' } },
                    { content: `${plan.lesson_number}/${plan.total_lessons || '?'}`, styles: { halign: 'center' } },
                    { content: plan.duration ? `${plan.duration} mins` : '-', styles: { halign: 'center' } },
                    { content: plan.class_size || '-', styles: { halign: 'center' }, colSpan: 2 }
                ],
                [
                    { content: 'Special Needs provision / Number of learners', colSpan: 3, styles: { fontStyle: 'bold', fillColor: '#f2f2f2' } },
                    { content: header.special_needs_provision || 'None', colSpan: 7 }
                ],
                [{ content: 'Unit title', colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#f2f2f2' } }, { content: header.unit_title || plan.unit_title || '-', colSpan: 8 }],
                [{ content: 'Key Unit Competence', colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#f2f2f2' } }, { content: header.key_unit_competence || '-', colSpan: 8 }],
                [{ content: 'Title of the lesson', colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#f2f2f2' } }, { content: header.lesson_title || plan.lesson_title || '-', colSpan: 8 }],
                [{ content: 'Instructional Objective', colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#f2f2f2' } }, { content: header.instructional_objective || '-', colSpan: 8 }],
                [{ content: 'Plan for this Class (location: in / outside)', colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#f2f2f2' } }, { content: header.plan_for_class || plan.location || '-', colSpan: 8 }],
                [{ content: 'Learning Materials (for all learners)', colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#f2f2f2' } }, { content: header.learning_materials || '-', colSpan: 8 }],
                [{ content: 'References', colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#f2f2f2' } }, { content: header.references || '-', colSpan: 8 }]
            ]
        });

        // Activity Table - 10 column structure
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 1.0,
            theme: 'grid',
            styles: {
                fontSize: 9,
                font: 'times',
                cellPadding: 4,
                textColor: '#000000',
                lineColor: '#000000',
                lineWidth: 0.1,
                valign: 'top'
            },
            columnStyles: {
                0: { cellWidth: 18 }, // Timing (1 col)
                1: { cellWidth: 17 }, // Teacher activities (3 cols)
                2: { cellWidth: 17 },
                3: { cellWidth: 17 },
                4: { cellWidth: 17 }, // Learner activities (3 cols)
                5: { cellWidth: 17 },
                6: { cellWidth: 17 },
                7: { cellWidth: 23 }, // Generic/Cross-cutting (3 cols)
                8: { cellWidth: 23 },
                9: { cellWidth: 24 }
            },
            body: [
                [
                    { content: 'Timing for each step', rowSpan: 3, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fillColor: '#f2f2f2' } },
                    { content: 'Description of teaching and learning activity', colSpan: 6, styles: { halign: 'center', fontStyle: 'bold', fillColor: '#f2f2f2' } },
                    { content: 'Generic competences and Cross cutting issues to be addressed + a short explanation', rowSpan: 3, colSpan: 3, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fillColor: '#f2f2f2' } }
                ],
                [
                    { content: data.lesson_flow_overview || '-', colSpan: 6, styles: { fontStyle: 'italic', halign: 'left', cellPadding: 5, fillColor: '#ffffff' } }
                ],
                [
                    { content: 'Teacher activities', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold', fillColor: '#f2f2f2' } },
                    { content: 'Learner activities', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold', fillColor: '#f2f2f2' } }
                ],
                ...phases.map(section => [
                    { content: `${section.section_name}\n(${section.timing})`, styles: { fontStyle: 'bold', halign: 'center', valign: 'top' } },
                    {
                        content: (section.sub_phases || section.subphases || []).map(sub => `• ${sub.type} Phase:\n${Array.isArray(sub.teacher_activities) ? sub.teacher_activities.map(a => `   - ${a}`).join('\n') : sub.teacher_activities || ''}`).join('\n\n'),
                        colSpan: 3
                    },
                    {
                        content: (section.sub_phases || section.subphases || []).map(sub => `${Array.isArray(sub.learner_activities) ? sub.learner_activities.map(a => `• ${a}`).join('\n') : sub.learner_activities || ''}`).join('\n\n'),
                        colSpan: 3
                    },
                    {
                        content: (section.sub_phases || section.subphases || []).map(sub => `${Array.isArray(sub.competences) ? sub.competences.map(c => `• ${c}`).join('\n') : sub.competences || ''}`).join('\n\n'),
                        colSpan: 3
                    }
                ])
            ]
        });

        // Self-evaluation
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 0.1,
            theme: 'grid',
            styles: {
                fontSize: 10,
                font: 'times',
                cellPadding: 5,
                textColor: '#000000',
                lineColor: '#000000',
                lineWidth: 0.1
            },
            body: [
                [
                    { content: "Teacher's self-evaluation", colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#f2f2f2', cellWidth: 45 } },
                    { content: data.teacher_self_evaluation || '-', colSpan: 8 }
                ]
            ]
        });
    };

    const handleDownload = async (format) => {
        if (selectedPlans.length === 0) {
            toast.error('Please select at least one lesson plan');
            return;
        }

        setDownloading(true);
        const plansToDownload = plans.filter(p => selectedPlans.includes(p.id))
            .sort((a, b) => a.lesson_number - b.lesson_number);

        try {
            if (format === 'merged-pdf') {
                const doc = new jsPDF('p', 'mm', 'a4');
                plansToDownload.forEach((plan, index) => addPlanToPDF(doc, plan, index === 0));
                doc.save(`${unitTitle}_Lesson_Plans.pdf`);
            } else if (format === 'merged-docx') {
                await generateMergedDOCX(plansToDownload);
            } else if (format === 'zip') {
                await generateZIP(plansToDownload);
            }
            toast.success('Download successfully started');
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to generate files');
        } finally {
            setDownloading(false);
        }
    };

    const generateMergedDOCX = async (plansData) => {
        const sections = plansData.map(plan => {
            const data = parseAIContent(plan.content);
            if (!data) return null;

            const header = data.header_details || {};
            const phases = data.phases || [];

            const createCell = (text, opts = {}) => new TableCell({
                children: [
                    ...String(text || "-").split('\n').map(line => new Paragraph({
                        children: [new TextRun({
                            text: line.trim(),
                            bold: opts.bold,
                            italic: opts.italic,
                            size: 22, // 11pt
                            font: "Times New Roman"
                        })],
                        alignment: opts.center ? AlignmentType.CENTER : (opts.right ? AlignmentType.RIGHT : AlignmentType.LEFT),
                        spacing: { before: 100, after: 100 }
                    }))
                ],
                columnSpan: opts.colSpan || 1,
                rowSpan: opts.rowSpan || 1,
                shading: opts.header ? { fill: "F2F2F2", type: ShadingType.CLEAR } : undefined,
                verticalAlign: "center",
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    right: { style: BorderStyle.SINGLE, size: 1, color: "000000" }
                }
            });

            const createRowWithLabel = (label, value) => new TableRow({
                children: [
                    createCell(label, { bold: true, colSpan: 2, header: true }),
                    createCell(value, { colSpan: 8 })
                ]
            });

            return {
                properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({ text: `School Name: ${plan.school_name || '-'}`, bold: true, size: 32, font: "Times New Roman" }),
                            new TextRun({ text: `        `, size: 32, font: "Times New Roman" }), // Spacing
                            new TextRun({ text: `Teacher's name: ${plan.teacher_name || '-'}`, bold: true, size: 32, font: "Times New Roman" })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 }
                    }),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({
                                children: [
                                    createCell("Term", { bold: true, center: true, header: true }),
                                    createCell("Date", { bold: true, center: true, header: true }),
                                    createCell("Subject", { bold: true, center: true, header: true, colSpan: 2 }),
                                    createCell("Class", { bold: true, center: true, header: true }),
                                    createCell("Unit Nº", { bold: true, center: true, header: true }),
                                    createCell("Lesson Nº", { bold: true, center: true, header: true }),
                                    createCell("Duration", { bold: true, center: true, header: true }),
                                    createCell("Class size", { bold: true, center: true, header: true, colSpan: 2 })
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell(plan.term, { center: true }),
                                    createCell(plan.teaching_date ? new Date(plan.teaching_date).toLocaleDateString('en-GB') : '', { center: true }),
                                    createCell(plan.subject_name, { center: true, colSpan: 2 }),
                                    createCell(plan.class_name, { center: true }),
                                    createCell(plan.unit_number, { center: true }),
                                    createCell(`${plan.lesson_number}/${plan.total_lessons || '?'}`, { center: true }),
                                    createCell(plan.duration ? `${plan.duration} mins` : '', { center: true }),
                                    createCell(plan.class_size, { center: true, colSpan: 2 })
                                ]
                            }),
                            new TableRow({
                                children: [
                                    createCell("Type of Special Educational Needs to be catered for in this lesson and number of learners in each category", { bold: true, colSpan: 3, header: true }),
                                    createCell(header.special_needs_provision || "None", { colSpan: 7 })
                                ]
                            }),
                            createRowWithLabel("Unit title", header.unit_title || plan.unit_title),
                            createRowWithLabel("Key Unit Competence", header.key_unit_competence),
                            createRowWithLabel("Title of the lesson", header.lesson_title),
                            createRowWithLabel("Instructional Objective", header.instructional_objective),
                            createRowWithLabel("Plan for this Class", header.plan_for_class || plan.location),
                            createRowWithLabel("Learning Materials", header.learning_materials),
                            createRowWithLabel("References", header.references),
                            new TableRow({
                                children: [
                                    createCell("Timing for each step", { bold: true, center: true, rowSpan: 3, header: true }),
                                    createCell("Description of teaching and learning activity", { bold: true, center: true, colSpan: 6, header: true }),
                                    createCell("Generic competences and Cross cutting issues to be addressed + a short explanation", { bold: true, center: true, colSpan: 3, rowSpan: 3, header: true })
                                ]
                            }),
                            new TableRow({ children: [createCell(data.lesson_flow_overview, { colSpan: 6, italic: true, center: false })] }),
                            new TableRow({
                                children: [
                                    createCell("Teacher activities", { bold: true, center: true, colSpan: 3, header: true }),
                                    createCell("Learner activities", { bold: true, center: true, colSpan: 3, header: true })
                                ]
                            }),
                            ...phases.map(section => new TableRow({
                                children: [
                                    createCell(`${section.section_name}\n(${section.timing})`, { bold: true, center: true }),
                                    createCell((section.sub_phases || section.subphases || []).map(sub => `• ${sub.type} Phase:\n${Array.isArray(sub.teacher_activities) ? sub.teacher_activities.map(a => `   - ${a}`).join('\n') : sub.teacher_activities || ''}`).join('\n\n'), { colSpan: 3 }),
                                    createCell((section.sub_phases || section.subphases || []).map(sub => `${Array.isArray(sub.learner_activities) ? sub.learner_activities.map(a => `• ${a}`).join('\n') : sub.learner_activities || ''}`).join('\n\n'), { colSpan: 3 }),
                                    createCell((section.sub_phases || section.subphases || []).map(sub => `${Array.isArray(sub.competences) ? sub.competences.map(c => `• ${c}`).join('\n') : sub.competences || ''}`).join('\n\n'), { colSpan: 3 })
                                ]
                            })),
                            createRowWithLabel("Teacher's self-evaluation", data.teacher_self_evaluation || '-')
                        ]
                    })
                ]
            };
        }).filter(Boolean);

        const doc = new Document({ sections });
        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${unitTitle}_Lesson_Plans.docx`);
    };

    const generateZIP = async (plansData) => {
        const zip = new JSZip();
        for (const plan of plansData) {
            const doc = new jsPDF('p', 'mm', 'a4');
            addPlanToPDF(doc, plan, true);
            const pdfBlob = doc.output('blob');
            zip.file(`Lesson_${plan.lesson_number}_${plan.lesson_title.replace(/[^a-z0-9]/gi, '_')}.pdf`, pdfBlob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `${unitTitle}_Lesson_Plans.zip`);
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Export Unit Lesson Plans">
            <div style={{ padding: '0 4px' }}>
                <p className="profile-email">
                    Select lesson plans to export for <strong>{unitTitle}</strong>.
                </p>

                {loading ? (
                    <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="spinner"></div>
                    </div>
                ) : plans.length === 0 ? (
                    <div className="empty-state-workspace" style={{ padding: '40px 20px' }}>
                        <FiFileText size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                        <p>No lesson plans found for this unit.</p>
                    </div>
                ) : (
                    <>
                        <div style={{
                            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                            padding: '16px',
                            borderRadius: '20px',
                            marginBottom: '20px',
                            border: '1px solid var(--border-color)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '12px',
                            fontSize: '13px'
                        }}>
                            <div><span style={{ color: 'var(--color-gray-500)' }}>School:</span> <span style={{ fontWeight: '700' }}>{plans[0]?.school_name || 'N/A'}</span></div>
                            <div><span style={{ color: 'var(--color-gray-500)' }}>Class:</span> <span style={{ fontWeight: '700' }}>{plans[0]?.class_name}</span></div>
                            <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--color-gray-500)' }}>Teacher:</span> <span style={{ fontWeight: '700' }}>{plans[0]?.teacher_name}</span></div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 4px' }}>
                            <button onClick={toggleSelectAll} className="edit-btn-pill" style={{ fontSize: '12px', background: 'white', border: '1px solid var(--border-color)', height: '32px' }}>
                                {selectedPlans.length === plans.length ? 'Deselect All' : 'Select All'}
                            </button>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-primary)' }}>{selectedPlans.length} Selected</span>
                        </div>

                        <div style={{
                            maxHeight: '220px',
                            overflowY: 'auto',
                            marginBottom: '28px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '20px',
                            padding: '8px',
                            background: '#fff'
                        }}>
                            {plans.map(plan => (
                                <div
                                    key={plan.id}
                                    onClick={() => toggleSelection(plan.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '14px 16px',
                                        cursor: 'pointer',
                                        borderRadius: '14px',
                                        marginBottom: '4px',
                                        background: selectedPlans.includes(plan.id) ? '#eff6ff' : 'transparent',
                                        transition: 'all 0.2s',
                                        border: selectedPlans.includes(plan.id) ? '1px solid #bfdbfe' : '1px solid transparent'
                                    }}
                                >
                                    {selectedPlans.includes(plan.id) ?
                                        <FiCheckSquare size={20} color="var(--color-primary)" /> :
                                        <FiSquare size={20} color="var(--color-gray-300)" />
                                    }
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--color-gray-900)' }}>Lesson {plan.lesson_number}: {plan.lesson_title}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '2px' }}>
                                            {new Date(plan.teaching_date).toLocaleDateString('en-GB')} • v{plan.version}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            <button
                                onClick={() => handleDownload('merged-pdf')}
                                className="update-btn-blue"
                                disabled={downloading || selectedPlans.length === 0}
                                style={{ height: '52px', fontSize: '14px' }}
                            >
                                <FiFileText /> Combined PDF
                            </button>
                            <button
                                onClick={() => handleDownload('merged-docx')}
                                className="update-btn-blue"
                                disabled={downloading || selectedPlans.length === 0}
                                style={{ height: '52px', fontSize: '14px', background: '#2563eb' }}
                            >
                                <FiFileText /> Combined DOCX
                            </button>
                            <button
                                onClick={() => handleDownload('zip')}
                                className="update-btn-white"
                                disabled={downloading || selectedPlans.length === 0}
                                style={{ gridColumn: '1 / -1', height: '48px', border: '1.5px solid var(--border-color)', fontWeight: '600' }}
                            >
                                <FiArchive /> ZIP Archive (Individual Files)
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default DownloadPlansModal;
