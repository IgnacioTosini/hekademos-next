import type { FormEvent } from 'react';
import { IoMdClose } from 'react-icons/io';
import type { CoachDashboardStudent } from './CoachDashboard';

type Props = {
    student: CoachDashboardStudent;
    routineExcelUrl: string;
    monthlyPricePesos: string;
    notes: string;
    isPending: boolean;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onRoutineChange: (value: string) => void;
    onPriceChange: (value: string) => void;
    onNotesChange: (value: string) => void;
};

export const CoachStudentEditModal = ({ student: selectedStudent, routineExcelUrl, monthlyPricePesos, notes, isPending, onClose, onSubmit, onRoutineChange, onPriceChange, onNotesChange }: Props) => (
    <div className="coach-student-modal-container">
        <div className="coach-student-modal">
            <div className="coach-student-modal-header">
                <div>
                    <h2>Editar {selectedStudent.name}</h2>
                    <p>Rutina y notas de seguimiento.</p>
                </div>

                <button type="button" onClick={onClose} aria-label="Cerrar">
                    <IoMdClose />
                </button>
            </div>

            <form className="coach-student-form" onSubmit={onSubmit}>
                <div className="coach-student-form-group">
                    <label htmlFor="coach-student-routine">Rutina / Excel</label>
                    <input
                        id="coach-student-routine"
                        value={routineExcelUrl}
                        onChange={(event) => onRoutineChange(event.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/..."
                    />
                </div>

                <div className="coach-student-form-group">
                    <label htmlFor="coach-student-price">Precio mensual</label>
                    <input
                        id="coach-student-price"
                        type="number"
                        min="0"
                        step="1"
                        value={monthlyPricePesos}
                        onChange={(event) => onPriceChange(event.target.value)}
                        placeholder="55000"
                        disabled={!selectedStudent.hasActiveMembership}
                    />
                </div>

                <div className="coach-student-form-group">
                    <label htmlFor="coach-student-notes">Notas</label>
                    <textarea
                        id="coach-student-notes"
                        value={notes}
                        onChange={(event) => onNotesChange(event.target.value)}
                        placeholder="Observaciones del seguimiento"
                    />
                </div>

                <div className="coach-student-form-actions">
                    <button type="button" onClick={onClose} disabled={isPending}>
                        Cancelar
                    </button>
                    <button type="submit" disabled={isPending}>
                        {isPending ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </div>
            </form>
        </div>
    </div>

);
