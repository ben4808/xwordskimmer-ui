import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Header.module.scss';
import logo from '../../../logo.png';
import { useState, useRef, useEffect } from 'react';
import { HeaderProps } from './HeaderProps';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';
import { User } from 'cruzi-models';

const MENU_ITEMS = ['Crosswords', 'Collections'] as const;

function getDisplayUsername(user: User): string {
  return user.firstName?.trim() || user.email.split('@')[0];
}

const Header = ({ onLogout }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, handleGoogleSuccess, handleGoogleError } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopDropdownOpen, setIsDesktopDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState('Crosswords');

  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const desktopDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.pathname.startsWith('/crosswords')) {
      setSelectedMenuItem('Crosswords');
    } else if (location.pathname.startsWith('/collections')) {
      setSelectedMenuItem('Collections');
    }
  }, [location.pathname]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
    setIsDesktopDropdownOpen(false);
  };

  const toggleDesktopDropdown = () => {
    setIsDesktopDropdownOpen((prev) => !prev);
    setIsMobileMenuOpen(false);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen((prev) => !prev);
    setIsMobileMenuOpen(false);
    setIsDesktopDropdownOpen(false);
  };

  const handleModeClick = (menuItem: string) => {
    setSelectedMenuItem(menuItem);
    setIsMobileMenuOpen(false);
    setIsDesktopDropdownOpen(false);

    if (menuItem === 'Crosswords') {
      navigate('/crosswords');
    } else if (menuItem === 'Collections') {
      navigate('/collections');
    }
  };

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    onLogout();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
      if (desktopDropdownRef.current && !desktopDropdownRef.current.contains(event.target as Node)) {
        setIsDesktopDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const displayUsername = user ? getDisplayUsername(user) : '';

  const renderUserSection = () => (
    <div className={styles.rightSection}>
      {user ? (
        <div className={styles.userMenu} ref={userMenuRef}>
          <button
            className={styles.avatarButton}
            onClick={toggleUserMenu}
            aria-haspopup="true"
            aria-expanded={isUserMenuOpen}
            aria-label={`User menu for ${displayUsername}`}
          >
            <span className={styles.avatar}>
              {displayUsername.charAt(0).toUpperCase()}
            </span>
            <span className={styles.userName}>{displayUsername}</span>
          </button>
          {isUserMenuOpen && (
            <nav className={styles.userDropdown}>
              <ul className={styles.userDropdownList}>
                <li className={styles.userDropdownItem}>
                  <button
                    className={styles.userDropdownLink}
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      ) : (
        <div className={styles.googleLoginContainer}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="outline"
            shape="rectangular"
            size="medium"
            text="signin_with"
            width="200"
            useOneTap={false}
            auto_select={false}
            cancel_on_tap_outside={true}
          />
        </div>
      )}
    </div>
  );

  const renderLeftSection = () => (
    <div className={styles.leftSection}>
      <div className={styles.hamburger} ref={mobileMenuRef}>
        <button
          className={`${styles.hamburgerButton} ${isMobileMenuOpen ? styles.open : ''}`}
          onClick={toggleMobileMenu}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-navigation"
          aria-label="Toggle mobile navigation menu"
        >
          <span className={styles.hamburgerIcon} />
          <span className={styles.hamburgerIcon} />
          <span className={styles.hamburgerIcon} />
        </button>

        <nav id="mobile-navigation" className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.mobileMenuOpen : ''}`}>
          <ul className={styles.mobileMenuList}>
            {MENU_ITEMS.map((item) => (
              <li key={item} className={styles.mobileMenuItem}>
                <a
                  href="#"
                  className={`${styles.mobileMenuLink} ${selectedMenuItem === item ? styles.active : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleModeClick(item);
                  }}
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className={styles.desktopDropdown} ref={desktopDropdownRef}>
        <button
          className={`${styles.dropdownButton} ${isDesktopDropdownOpen ? styles.active : ''}`}
          onClick={toggleDesktopDropdown}
          aria-haspopup="true"
          aria-expanded={isDesktopDropdownOpen}
          aria-controls="desktop-navigation-menu"
        >
          {selectedMenuItem}
          <span className={styles.dropdownArrow}>&#9660;</span>
        </button>

        {isDesktopDropdownOpen && (
          <nav id="desktop-navigation-menu" className={styles.dropdownContent}>
            <ul className={styles.dropdownList}>
              {MENU_ITEMS.map((item) => (
                <li key={item} className={styles.dropdownItem}>
                  <a
                    href="#"
                    className={`${styles.dropdownLink} ${selectedMenuItem === item ? styles.active : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleModeClick(item);
                    }}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </div>
  );

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {renderLeftSection()}
        <div className={styles.logo}>
          <img src={logo} alt="Cruzi logo" className={styles.logoImage} />
        </div>
        {renderUserSection()}
      </div>
    </header>
  );
};

export default Header;
