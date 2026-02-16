import { IoIosMenu } from 'react-icons/io'
import { NavbarLinks } from '../NavbarLinks/NavbarLinks'
import './_navbar.scss'

type NavbarProps = {
    onToggleMobileMenu: () => void;
};

export const Navbar = ({ onToggleMobileMenu }: NavbarProps) => {
    return (
        <nav className="navbar">
            <NavbarLinks />
            <button
                className="mobileMenuButton"
                onClick={onToggleMobileMenu}
            >
                <IoIosMenu />
            </button>
        </nav>
    )
}