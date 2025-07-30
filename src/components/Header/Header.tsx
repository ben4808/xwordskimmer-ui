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
 6. The header should be responsive and work well on different screen sizes.
 7. The drop-down menu on small screens (mobile-sized) should be a hamburger menu that expands when clicked.
 8. The header should use TypeScript for type safety.
 */

import { useNavigate } from 'react-router-dom';
import styles from './Header.module.scss';
import logo from '../../../logo.png'; // Make sure this path is correct for your project
import { useState, useRef, useEffect } from 'react';

const Header = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopDropdownOpen, setIsDesktopDropdownOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState('Crosswords'); // Keeps track of active item for styling

  const menuItems = ['Crosswords', 'Collections', 'Word Finder'];
  const mobileMenuRef = useRef<HTMLDivElement>(null); // Ref for clicking outside mobile menu
  const desktopDropdownRef = useRef<HTMLDivElement>(null); // Ref for clicking outside desktop dropdown

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
    setIsDesktopDropdownOpen(false); // Close desktop dropdown if mobile menu is opened
  };

  const toggleDesktopDropdown = () => {
    setIsDesktopDropdownOpen((prev) => !prev);
    setIsMobileMenuOpen(false); // Close mobile menu if desktop dropdown is opened
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

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
      if (desktopDropdownRef.current && !desktopDropdownRef.current.contains(event.target as Node)) {
        setIsDesktopDropdownOpen(false);
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

        {/* Right Section (can be empty or hold other elements if needed) */}
        <div className={styles.rightSection}>
          {/* Add any other elements that might be on the right side */}
        </div>
      </div>
    </header>
  );
};

export default Header;
