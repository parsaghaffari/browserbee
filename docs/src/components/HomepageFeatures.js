import React from 'react';
import clsx from 'clsx';
import styles from './HomepageFeatures.module.css';

const FeatureList = [
  {
    title: 'Natural Language Control',
    Svg: require('../../static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Control your browser with simple, natural language commands. No need to learn
        complex syntax or programming languages.
      </>
    ),
  },
  {
    title: 'Multiple LLM Support',
    Svg: require('../../static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        Works with major LLM providers such as <strong>Anthropic</strong>, <strong>OpenAI</strong>, 
        <strong>Gemini</strong>, and local <strong>Ollama</strong> models.
      </>
    ),
  },
  {
    title: 'Privacy-First Design',
    Svg: require('../../static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        BrowserBee runs entirely within your browser, allowing it to interact with your
        logged-in websites without compromising security.
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} alt={title} />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
