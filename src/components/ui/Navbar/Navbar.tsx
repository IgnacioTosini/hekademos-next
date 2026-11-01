import { IoIosMenu } from 'react-icons/io'
import { NavbarLinks } from '../NavbarLinks/NavbarLinks'
import './_navbar.scss'

type NavbarProps = {
    onToggleMobileMenu: () => void;
    isMobileMenuOpen: boolean;
    links: Array<{ label: string; href: string }>;
};

export const Navbar = ({ onToggleMobileMenu, isMobileMenuOpen, links }: NavbarProps) => {
    return (
        <nav className="navbar">
            <NavbarLinks links={links} />
            <button
                className="mobileMenuButton"
                onClick={onToggleMobileMenu}
                type="button"
                aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-navigation"
            >
                <IoIosMenu />
            </button>
        </nav>
    )
}
