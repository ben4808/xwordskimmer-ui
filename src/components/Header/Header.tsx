import { HeaderProps } from './HeaderProps';

function Header(props: HeaderProps) {
    return (
        <div id="Header">
            {props.isInSolver &&
                <div id="dashboardButton">Dashboard</div>
            }
            <div id="logo">Cruci</div>
        </div>
    );
}

export default Header;
