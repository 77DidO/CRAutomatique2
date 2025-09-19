import PropTypes from 'prop-types';

const VARIANT_CLASSNAMES = {
  banner: 'dashboard-hero--banner',
  card: 'dashboard-hero--card'
};

function DashboardHero({ title, subtitle, actions, variant }) {
  const variantClass = VARIANT_CLASSNAMES[variant] ?? VARIANT_CLASSNAMES.banner;

  return (
    <section className={`dashboard-hero ${variantClass}`}>
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
  actions: PropTypes.node,
  variant: PropTypes.oneOf(['banner', 'card'])
};

DashboardHero.defaultProps = {
  title: 'Compte rendu automatique',
  subtitle: undefined,
  actions: null,
  variant: 'banner'
};

export default DashboardHero;
