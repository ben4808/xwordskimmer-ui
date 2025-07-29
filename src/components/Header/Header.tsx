/**
Create a header component for the a React app with the following features:
 1. The header should be of minimal height and at the very top of the page to not take up too much space.
 2. The header should be styled using an SCSS module.
 3. The header should contain a logo in the center.
 4. The header should have a styled drop-down menu on the left with the following options:
    - Crosswords
    - Collections
    - Word Finder
 5. The header should be responsive and work well on different screen sizes.
 6. The drop-down menu on small screens should be a hamburger menu that expands when clicked.
 7. The header should use TypeScript for type safety.
 8. The header should accept props the selected menu item.
 */

import { useNavigate } from 'react-router-dom';
import styles from './Header.module.scss';
import logo from '../../../logo.png';
import { useState } from 'react';

const Header = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState('Crosswords');

  const menuItems = ['Crosswords', 'Collections', 'Word Finder'];

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleModeClick = (menuItem: string) => {
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
    }

    setSelectedMenuItem(menuItem);
    setIsMenuOpen(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.hamburger}>
          <button
            className={styles.hamburgerButton}
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <span className={styles.hamburgerIcon} />
            <span className={styles.hamburgerIcon} />
            <span className={styles.hamburgerIcon} />
          </button>
        </div>

        <div className={`${styles.menu} ${isMenuOpen ? styles.menuOpen : ''}`}>
          <ul className={styles.menuList}>
            {menuItems.map((item) => (
              <li key={item} className={styles.menuItem}>
                <a
                  className={`${styles.menuLink} ${selectedMenuItem === item ? styles.active : ''}`}
                  onClick={() => handleModeClick(item)}
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.logo}>
          <img src={logo} alt="Logo" className={styles.logoImage} />
        </div>
      </div>
    </header>
  );
};

export default Header;
