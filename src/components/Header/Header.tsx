/**
Create a header component for the a React app with the following features:
 1. The header should be of minimal height and at the very top of the page to not take up too much space.
 2. The header should be styled using an SCSS module.
 3. The header should be styled in dark mode.
 4. The header should contain a logo in the center.
 5. The header should have a styled drop-down menu on the left side with the following options:
    - Crosswords
    - Collections
    - Word Finder
 6. On right right side, the header should have the first name of the logged-in user and a generic avator 
    (e.g., a circle with the first letter of the user's name).
    - If the user is not logged in, it should display a login button with the Google logo.
    - When the login button is clicked, it should redirect to the Google login page.
    - When the user is logged in, clicking on the avatar should open a drop-down menu with a logout option.
    - When the logout option is clicked, it should log the user out and redirect to the home page.
 7. The header should be responsive and work well on different screen sizes.
 8. The drop-down menu on small screens (mobile-sized) should be a hamburger menu that expands when clicked.
 9. The header should use TypeScript for type safety.
 */

import { useNavigate } from 'react-router-dom';
import styles from './Header.module.scss';
import logo from '../../../logo.png'; // Make sure this path is correct for your project
import { useState, useRef, useEffect } from 'react';
import googleLoginButton from '../../../google_login_button.png'; // Add Google logo for login button
import { HeaderProps } from './HeaderProps';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

const Header = (props: HeaderProps) => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopDropdownOpen, setIsDesktopDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false); // State for user dropdown
  const [selectedMenuItem, setSelectedMenuItem] = useState('Crosswords'); // Keeps track of active item for styling

  const menuItems = ['Crosswords', 'Collections', 'Word Finder'];
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
      case 'Word Finder':
        navigate('/word-finder');
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

  const handleSuccess = async (credentialResponse) => {
    try {
      // Send ID token to backend
      const response = await axios.post('/auth/google', {
        token: credentialResponse.credential,
      });
      console.log('Login Success:', response.data);
      // Store JWT or user data in localStorage/state management
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    } catch (error) {
      console.error('Login Failed:', error);
    }
  };

  const handleError = () => {
    console.error('Login Failed');
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

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Left Section: Mobile Hamburger or Desktop Dropdown */}
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

        {/* Logo in the center */}
        <div className={styles.logo}>
          <img src={logo} alt="Application Logo" className={styles.logoImage} />
        </div>

        {/* Right Section: User Avatar/Login Button */}
        <div className={styles.rightSection}>
          {props.user ? (
            <div className={styles.userMenu} ref={userMenuRef}>
              <button
                className={styles.avatarButton}
                onClick={toggleUserMenu}
                aria-haspopup="true"
                aria-expanded={isUserMenuOpen}
                aria-label={`User menu for ${props.user.firstName}`}
              >
                <span className={styles.avatar}>
                  {props.user.firstName.charAt(0).toUpperCase()}
                </span>
                <span className={styles.userName}>{props.user.firstName}</span>
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
            <GoogleOAuthProvider clientId="your-google-client-id">
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={handleError}
                theme="filled_black" // Enables dark mode
                shape="circle" // Makes the button rounded
                useOneTap // Optional: Enables one-tap login
              />
            </GoogleOAuthProvider>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
