'use client'

import { useEffect } from 'react';
import { IoCloseSharp } from 'react-icons/io5';
import { NavbarLinks } from '../NavbarLinks/NavbarLinks';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowRight } from 'react-icons/fa';
import './_asideNavbar.scss';

type AsideNavbarProps = {
    isOpen: boolean;
    onClose: () => void;
};

export const AsideNavbar = ({ isOpen, onClose }: AsideNavbarProps) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);
    return (
        <>
            <div className={`asideNavbar${isOpen ? ' open' : ''}`}>
                <div className='headerLogoAside'>
                    <Link href='/' className='logo'>
                        <Image
                            src="/LogoHekademos.png"
                            alt="Logo"
                            width={80}
                            height={80}
                            priority={true}
                            quality={90}
                        />
                    </Link>
                    <IoCloseSharp onClick={onClose} />
                </div>
                <NavbarLinks isAsideBar onClose={onClose} />

                <Link href="/#contacto" className="asideCta" onClick={onClose}>
                    Sumate a Hekademos <FaArrowRight />
                </Link>

                {/*<h2 className='asideNavbarTitle'>Mi Cuenta</h2>
                                {!uid ? (
                    <div className='asideNavbarUser'>
                        <Link href='auth/login' className='navbarLink' onClick={onClose}>
                            Iniciar Sesión
                        </Link>
                        <Link href='auth/register' className='navbarLink' onClick={onClose}>
                            Registrarse
                        </Link>
                    </div>
                ) : (
                    Object.entries(icons).length > 0 && (
                        <div className='asideNavbarIcons'>
                            {Object.entries(icons).map(([key, { icon, path, name }]) => {
                                // Si el path contiene ':id', reemplazarlo por el uid real
                                const finalPath = uid ? path.replace(':id', uid) : path;
                                return (
                                    <Link to={finalPath} key={key} className={`customIconAside ${key}`} onClick={onClose}>
                                        {icon || <span>❓</span>}
                                        <p className='categoryName'>{name}</p>
                                    </Link>
                                );
                            })}
                        </div>
                    )
                )} */}
            </div>
            <div
                className="asideNavbarOverlay"
                style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
                onClick={onClose}
            />
        </>
    )
}
