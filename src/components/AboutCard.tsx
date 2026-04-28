import React from 'react';
import { Info, Instagram, Mail, Coffee, Github } from 'lucide-react';
import BuildDate from './BuildDate';

const AboutCard: React.FC = () => {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <Info color="#2563eb" size={20} style={{ marginRight: 6 }} /> About
        </h3>
      </div>
      <div className="card-content">
        <div
          style={{
            backgroundColor: '#fefce8',
            color: '#7c2d12',
            padding: '8px 12px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          <div>
            HOW can I improve this app for you? {'\u2014'}{' '}
            <a
              href="mailto:sundial@gennetten.com?subject=Sundial%20Feedback"
              title="eMail the Author"
              style={{
                color: '#7c2d12',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                verticalAlign: 'middle',
              }}
            >
              <Mail size={16} color="#7c2d12" />
            </a>
          </div>
          <p
            style={{
              margin: '10px 0 0 0',
              fontSize: '13px',
              fontWeight: 500,
              lineHeight: 1.45,
            }}
          >
            My recently recorded talk for the{' '}
            <a
              href="https://www.youtube.com/playlist?list=PLXnHqH5AQBFzrIZiU6j2GuJqNQylxht3w"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#b45309', textDecoration: 'underline', fontWeight: 600 }}
            >
              World Sundial Day / Global Sundial Day online conference
            </a>{' '}
            is available in the official YouTube playlist.
          </p>
          <p
            style={{
              margin: '10px 0 0 0',
              fontSize: '13px',
              fontWeight: 500,
              lineHeight: 1.45,
            }}
          >
            I will be presenting the talk: &lsquo;
            <strong>Public Nodus</strong>
            : Why Everything You Know about Precision is Pointless.&rsquo; at the June{' '}
            <a
              href="https://sundials.org"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#b45309', textDecoration: 'underline', fontWeight: 600 }}
            >
              NASS conference
            </a>
            .
          </p>
        </div>
        <div
          dangerouslySetInnerHTML={{
            __html: `
  This App traces its origins back to a gloriously nerdy gem—the 
  <a href="https://precisionsundial.com/docs/1980-12-SundialArticle.pdf" target="_blank" rel="noopener noreferrer">Amateur Scientist column</a>
  from the December 1980 issue of Scientific American. 
  Back then, my first sundial app was coded with love (and 
  <a href="https://www.hp9845.net/9845/software/basic/" target="_blank" rel="noopener noreferrer">Rocky Mountain Basic</a>
  ) on an 
  <a href="https://www.hp9845.net/" target="_blank" rel="noopener noreferrer">HP9845</a> 
    desktop workstation, which was basically a space shuttle cockpit compared to the future IBM PC toddlers.

  Not content with digital wizardry alone, 
  like a caffinated Da Vinci, I scribbled out two pages of hand-drawn 
  <a href="https://precisionsundial.com/docs/AnalemmaIllustrationFromJune1985.pdf" target="_blank" rel="noopener noreferrer">instructional</a>,
  <a href="https://precisionsundial.com/docs/SundialIllustrationFromJune1985.pdf" target="_blank" rel="noopener noreferrer">illustrations</a>.
</p>
<p>The sundial generator uses the 
<a href="https://academic.oup.com/mnras/article/238/4/1529/1037665" target="_blank" rel="noopener noreferrer">Hughes, Yallop & Hohenkerk</a>
algorithm which "enables it to be calculated for any epoch within 30 centuries of the present day, to a precision of about 3 seconds of time." 
</p>
`,
          }}
        />
        {/* Bottom row with build date and social icons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1rem',
          }}
        >
          <BuildDate />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a
              href="https://buymeacoffee.com/dgennetten"
              target="_blank"
              rel="noopener noreferrer"
              title="Buy me a Coffee!"
              style={{
                color: '#2563eb',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <Coffee size={22} color="#2563eb" style={{ verticalAlign: 'middle' }} />
            </a>
            <a
              href="https://github.com/dgennetten/sundial-generator"
              target="_blank"
              rel="noopener noreferrer"
              title="View Source Code on GitHub"
              style={{
                color: '#2563eb',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <Github size={22} color="#2563eb" style={{ verticalAlign: 'middle' }} />
            </a>
            <a
              href="mailto:douglas@gennetten.org?subject=Sundial%20Feedback"
              title="eMail the Author"
              style={{
                color: '#2563eb',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <Mail size={22} color="#2563eb" style={{ verticalAlign: 'middle' }} />
            </a>
            <a
              href="https://instagram.com/dgennetten"
              target="_blank"
              rel="noopener noreferrer"
              title="Follow @dgennetten on Instagram"
              style={{
                color: '#2563eb',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <Instagram size={22} color="#2563eb" style={{ verticalAlign: 'middle' }} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AboutCard);

