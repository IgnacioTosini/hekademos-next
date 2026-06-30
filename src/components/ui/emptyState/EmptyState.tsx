import type { ReactNode } from "react";
import { FaInbox } from "react-icons/fa";
import "./_emptyState.scss";

type Props = {
    title: string;
    description?: string;
    action?: ReactNode;
    compact?: boolean;
    className?: string;
};

export const EmptyState = ({
    title,
    description,
    action,
    compact = false,
    className = "",
}: Props) => (
    <div className={`empty-state${compact ? " empty-state-compact" : ""}${className ? ` ${className}` : ""}`}>
        <div className="empty-state-icon" aria-hidden="true">
            <FaInbox />
        </div>

        <div className="empty-state-copy">
            <strong>{title}</strong>
            {description && <p>{description}</p>}
        </div>

        {action && <div className="empty-state-action">{action}</div>}
    </div>
);
