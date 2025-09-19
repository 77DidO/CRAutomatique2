import PropTypes from 'prop-types';

function DashboardHero({ title, subtitle, actions }) {
  return (
    <section className="dashboard-hero">
      <div className="dashboard-hero__content">
        <h1 className="dashboard-hero__title">{title}</h1>
        {subtitle ? <p className="dashboard-hero__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="dashboard-hero__actions">{actions}</div> : null}
    </section>
  );
}

DashboardHero.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  actions: PropTypes.node
};

DashboardHero.defaultProps = {
  title: 'Compte rendu automatique',
  subtitle: undefined,
  actions: null
};

export default DashboardHero;
