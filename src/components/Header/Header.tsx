/**
Modify the code in this React component according to the given requirements. 
Assume that all other components are already in an optimal, working state.

General
- The site is built in React with Typescript.
- The entire site is responsive and works well on both phones and computers. 
- Each component includes an SCSS module and does not use Tailwind or any other additional CSS framework.
- The site supports login with Google OAuth and manages authentication with a JWT token. 
    The JWT token contains a custom claim for the currently logged in username.
- The site is styled in Dark Mode, using a standard Dark Mode color set with accent color 
    as a pleasing light blue.
- The header is part of the page and does not float on top of the screen.

Header for Crosswords/Collections/Dictionary pages
- On the left side of the header is a dropdown menu with the options “Crosswords”, “Collections”, 
    and “Dictionary”.
- The dropdown is a hamburger list on mobile. On desktop, it is a dropdown that shows the currently 
    selected item.
- On the right side of the header is the logged in user information. When the user is not logged in, 
    there is a “log in with Google” button, using the appropriate branded button from Google. 
    When the user is logged in, there is a Google style circle with the first letter of the 
    user’s username and the username itself. Clicking on the username opens a dropdown menu 
    with a “Logout” option.
- In the middle of the header is the Cruzi logo.

Header for Collection page
- On the left side of the header is a Back button that takes the user back to the Collections List page.
- In the middle is the name of the active Collection.
- On the right side is the user info, the same as the previous section

Header for the Collection Quiz page:
- On the left side of the header is a Back button that takes the user back to the Collection page.
- The middle and right sides are the same as the Collection page.
 */

import { useNavigate } from 'react-router-dom';
import styles from './Header.module.scss';
import logo from '../../../logo.png'; // Make sure this path is correct for your project
import { useState, useRef, useEffect } from 'react';
import { HeaderProps } from './HeaderProps';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';

const Header = (props: HeaderProps) => {
  const navigate = useNavigate();
  const { user, handleGoogleSuccess, handleGoogleError } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopDropdownOpen, setIsDesktopDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false); // State for user dropdown
  const [selectedMenuItem, setSelectedMenuItem] = useState('Crosswords'); // Keeps track of active item for styling

  const menuItems = ['Crosswords', 'Collections', 'Dictionary'];
  const mobileMenuRef = useRef<HTMLDivElement>(null); // Ref for clicking outside mobile menu
  const desktopDropdownRef = useRef<HTMLDivElement>(null); // Ref for clicking outside desktop dropdown
  const userMenuRef = useRef<HTMLDivElement>(null); // Ref for clicking outside user menu

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
    setIsDesktopDropdownOpen(false); // Close desktop dropdown if mobile menu is opened
  };

  const toggleDesktopDropdown = () => {
    setIsDesktopDropdownOpen((prev) => !prev);
    setIsMobileMenuOpen(false); // Close mobile menu if desktop dropdown is opened
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen((prev) => !prev);
    setIsMobileMenuOpen(false); // Close mobile menu if user menu is opened
    setIsDesktopDropdownOpen(false); // Close desktop dropdown if user menu is opened
  };

  const handleModeClick = (menuItem: string) => {
    setSelectedMenuItem(menuItem); // Set the selected item for styling
    setIsMobileMenuOpen(false); // Close mobile menu after selection
    setIsDesktopDropdownOpen(false); // Close desktop dropdown after selection

    switch (menuItem) {
      case 'Crosswords':
        navigate('/crosswords');
        break;
      case 'Collections':
        navigate('/collections');
        break;
      case 'Dictionary':
        navigate('/dictionary');
        break;
      default:
        navigate('/'); // Default navigation
        break;
    }
  };

  const handleLogin = () => {
    setIsUserMenuOpen(false);
    props.onLogin(); // Call the login function passed from props
  };

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    props.onLogout(); // Call the logout function passed from props
  };

  // Close menus when clicking outside
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
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

  // Common user authentication section
  const renderUserSection = () => (
    <div className={styles.rightSection}>
      {user ? (
        <div className={styles.userMenu} ref={userMenuRef}>
          <button
            className={styles.avatarButton}
            onClick={toggleUserMenu}
            aria-haspopup="true"
            aria-expanded={isUserMenuOpen}
            aria-label={`User menu for ${user.firstName}`}
          >
            <span className={styles.avatar}>
              {user.firstName.charAt(0).toUpperCase()}
            </span>
            <span className={styles.userName}>{user.firstName}</span>
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
            theme="filled_black" // Enables dark mode
            shape="circle" // Makes the button rounded
            useOneTap // Optional: Enables one-tap login
          />
        </div>
      )}
    </div>
  );

  // Left section for main header (navigation menu)
  const renderMainLeftSection = () => (
    <div className={styles.leftSection}>
      {/* Mobile Hamburger Menu */}
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

        {/* Mobile Menu Overlay */}
        <nav id="mobile-navigation" className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.mobileMenuOpen : ''}`}>
          <ul className={styles.mobileMenuList}>
            {menuItems.map((item) => (
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

      {/* Desktop Dropdown Menu */}
      <div className={styles.desktopDropdown} ref={desktopDropdownRef}>
        <button
          className={`${styles.dropdownButton} ${isDesktopDropdownOpen ? styles.active : ''}`}
          onClick={toggleDesktopDropdown}
          aria-haspopup="true"
          aria-expanded={isDesktopDropdownOpen}
          aria-controls="desktop-navigation-menu"
        >
          {selectedMenuItem} {/* Display the currently selected item or a default */}
          <span className={styles.dropdownArrow}>&#9660;</span> {/* Down arrow */}
        </button>

        {/* Dropdown Content */}
        {isDesktopDropdownOpen && (
          <nav id="desktop-navigation-menu" className={styles.dropdownContent}>
            <ul className={styles.dropdownList}>
              {menuItems.map((item) => (
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

  // Left section for collection/quiz headers (back button)
  const renderBackLeftSection = () => (
    <div className={styles.leftSection}>
      <button
        className={styles.backButton}
        onClick={props.onBack}
        aria-label={props.headerType === 'quiz' ? 'Go back to Collection' : 'Go back to Collections'}
      >
        ← Back
      </button>
    </div>
  );

  // Center section for main header (logo)
  const renderMainCenterSection = () => (
    <div className={styles.logo}>
      <img src={logo} alt="Application Logo" className={styles.logoImage} />
    </div>
  );

  // Center section for collection/quiz headers (collection name)
  const renderCollectionCenterSection = () => (
    <div className={styles.centerContent}>
      <h1 className={styles.collectionTitle}>
        {props.collectionName || (props.headerType === 'quiz' ? 'Collection Quiz' : 'Collection')}
      </h1>
    </div>
  );

  // Determine which sections to render based on headerType
  const headerType = props.headerType || 'main';
  
  const renderLeftSection = () => {
    switch (headerType) {
      case 'collection':
      case 'quiz':
        return renderBackLeftSection();
      default:
        return renderMainLeftSection();
    }
  };

  const renderCenterSection = () => {
    switch (headerType) {
      case 'collection':
      case 'quiz':
        return renderCollectionCenterSection();
      default:
        return renderMainCenterSection();
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {renderLeftSection()}
        {renderCenterSection()}
        {renderUserSection()}
      </div>
    </header>
  );
};

export default Header;
