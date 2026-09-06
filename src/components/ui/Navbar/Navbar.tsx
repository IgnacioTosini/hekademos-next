import { IoIosMenu } from 'react-icons/io'
import { NavbarLinks } from '../NavbarLinks/NavbarLinks'
import './_navbar.scss'

type NavbarProps = {
    onToggleMobileMenu: () => void;
    links: Array<{ label: string; href: string }>;
};

export const Navbar = ({ onToggleMobileMenu, links }: NavbarProps) => {
    return (
        <nav className="navbar">
            <NavbarLinks links={links} />
            <button
                className="mobileMenuButton"
                onClick={onToggleMobileMenu}
            >
                <IoIosMenu />
            </button>
        </nav>
    )
}
