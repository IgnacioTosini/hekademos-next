import type { UserWithRelations } from "@/types/schema/users";
import "./_dashboardSummary.scss";

type Props = {
    users: UserWithRelations[];
};

export const DashboardSummary = ({ users }: Props) => {
    const activeUsers = users.filter((user) => user.status === "ACTIVE").length;
    const inactiveUsers = users.filter((user) => user.status === "INACTIVE").length;
    const suspendedUsers = users.filter((user) => user.status === "SUSPENDED").length;
    const adminUsers = users.filter((user) => user.role === "ADMIN").length;

    const items = [
        {
            label: "Usuarios activos",
            value: activeUsers,
        },
        {
            label: "Administradores",
            value: adminUsers,
        },
        {
            label: "Inactivos",
            value: inactiveUsers,
        },
        {
            label: "Suspendidos",
            value: suspendedUsers,
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
