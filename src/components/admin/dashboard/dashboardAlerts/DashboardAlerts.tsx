"use client";

import { useState } from "react";
import Link from "next/link";
import { FaArrowRight, FaExclamationTriangle, FaExternalLinkAlt } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import type { AdminAlert } from "@/app/actions/alert.actions";
import "./_dashboardAlerts.scss";

type Props = {
    alerts: AdminAlert[];
};

const severityLabels = {
    HIGH: "Alta",
    MEDIUM: "Media",
    LOW: "OK",
};

const maxVisibleAlerts = 7;

export const DashboardAlerts = ({ alerts }: Props) => {
    const [selectedAlert, setSelectedAlert] = useState<AdminAlert | null>(null);
    const visibleAlerts = alerts.slice(0, maxVisibleAlerts);
    const activeAlertsCount = alerts.filter((alert) => alert.count > 0).length;

    return (
        <section className="dashboard-alerts">
            <div className="dashboard-alerts-header">
                <div>
                    <h2>Alertas</h2>
                    <p>{activeAlertsCount} puntos para revisar</p>
                </div>

                <FaExclamationTriangle />
            </div>

            <div className="dashboard-alerts-list">
                {visibleAlerts.map((alert) => (
                    <button
                        className="dashboard-alert"
                        type="button"
                        onClick={() => setSelectedAlert(alert)}
                        key={alert.id}
                    >
                        <div className="dashboard-alert-main">
                            <span className={`dashboard-alert-severity dashboard-alert-severity-${alert.severity.toLowerCase()}`}>
                                {severityLabels[alert.severity]}
                            </span>
                            <strong>{alert.title}</strong>
                            <p>{alert.description}</p>
                        </div>

                        <div className="dashboard-alert-side">
                            <strong>{alert.count}</strong>
                            <FaArrowRight />
                        </div>
                    </button>
                ))}
            </div>

            {selectedAlert && (
                <div className="dashboard-alert-modal-container">
                    <div className="dashboard-alert-modal">
                        <div className="dashboard-alert-modal-header">
                            <div>
                                <h2>{selectedAlert.title}</h2>
                                <p>{selectedAlert.description}</p>
                            </div>

                            <button type="button" onClick={() => setSelectedAlert(null)} aria-label="Cerrar alertas">
                                <IoMdClose />
                            </button>
                        </div>

                        {selectedAlert.items.length > 0 ? (
                            <div className="dashboard-alert-modal-list">
                                {selectedAlert.items.map((item) => (
                                    <Link className="dashboard-alert-modal-item" href={item.href} key={item.id}>
                                        <div>
                                            <strong>{item.title}</strong>
                                            <span>{item.description}</span>
                                        </div>
                                        <FaExternalLinkAlt />
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="dashboard-alert-modal-empty">
                                <strong>Sin pendientes</strong>
                                <span>No hay elementos para revisar en esta alerta.</span>
                            </div>
                        )}

                        <div className="dashboard-alert-modal-footer">
                            {selectedAlert.count > selectedAlert.items.length && (
                                <span>
                                    Mostrando {selectedAlert.items.length} de {selectedAlert.count}
                                </span>
                            )}
                            <Link href={selectedAlert.href}>
                                Ir a la seccion
                                <FaExternalLinkAlt />
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};
