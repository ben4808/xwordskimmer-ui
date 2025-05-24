/**
Create a header component for the a React app with the following features:
 1. The header should be of minimal height and at the very top of the page to not take up too much space.
 2. The header should be styled using an SCSS module.
 3. The header should contain a logo in the center.
 4. The header should have a button on the left that navigates to the dashboard when clicked.
 5. The header should be responsive and work well on different screen sizes.
 6. The header should use TypeScript for type safety.
 7. The header should accept props to determine if the dashboard button should be displayed.
 */

import { HeaderProps } from './HeaderProps';
import { useNavigate } from 'react-router-dom';
import styles from './Header.module.scss';
import logo from '../../../logo.png';

const Header = ({ showDashboardButton }: HeaderProps) => {
  const navigate = useNavigate();

  const handleDashboardClick = () => {
    navigate('/dashboard');
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {showDashboardButton && (
          <button
            onClick={handleDashboardClick}
            className={styles.dashboardButton}
          >
            Dashboard
          </button>
        )}
        <img src={logo} alt="Logo" className={styles.logo} />
      </div>
    </header>
  );
};

export default Header;
