import type { DashboardUserSummary as DashboardUserSummaryData } from "@/app/actions/user.actions";
import "./_dashboardSummary.scss";

type Props = {
    summary: DashboardUserSummaryData;
};

export const DashboardSummary = ({ summary }: Props) => {
    const items = [
        {
            label: "Usuarios activos",
            value: summary.activeUsersCount,
        },
        {
            label: "Administradores",
            value: summary.adminUsersCount,
        },
        {
            label: "Inactivos",
            value: summary.inactiveUsersCount,
        },
        {
            label: "Suspendidos",
            value: summary.suspendedUsersCount,
        },
    ];

    return (
        <section className="dashboard-summary">
            <h2>Resumen</h2>

            <dl>
                {items.map((item) => (
                    <div key={item.label}>
                        <dt>{item.label}</dt>
                        <dd>{item.value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
};
