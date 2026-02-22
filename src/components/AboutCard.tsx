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

          <p>
            <strong>New Feature:</strong> New 'Dial Shape' option!  Now you can create oval and circular dials.
          </p>
           <p>
            <strong>New Feature:</strong> New "Calculated" dash styles. The dashes contain date/time information in their position and length. 
            (this is getting closer to my 1985 code - see '11x17 inch sundial' link below.) These caclulated dashes aid in interpolating between
            hourlines and declination lines. 
          </p>
          <p>
            <strong>Planned Features:</strong> (1) Optional Sun Azimuth and Altitude lines. (2) Optional horizon clipping. (3) Detailed instructions.
          </p>
        </div>
        <div
          dangerouslySetInnerHTML={{
            __html: `
  This App traces its origins back to a gloriously nerdy gem—the 
  <a href="https://sundial.gennetten.org/docs/1980-12-SundialArticle.pdf" target="_blank" rel="noopener noreferrer">Amateur Scientist column</a>
  from the December 1980 issue of Scientific American. 
  Back then, my first sundial app was coded with love (and 
  <a href="https://www.hp9845.net/9845/software/basic/" target="_blank" rel="noopener noreferrer">Rocky Mountain Basic</a>
  ) on an 
  <a href="https://www.hp9845.net/" target="_blank" rel="noopener noreferrer">HP9845</a> 
    desktop workstation, which was basically a space shuttle cockpit compared to the future IBM PC toddlers.

  Not content with digital wizardry alone, I whipped up an 
  <a href="https://sundial.gennetten.org/docs/SolarClockAd.pdf" target="_blank" rel="noopener noreferrer">advertisement</a>
  and, like a caffinated Da Vinci, scribbled out hand-drawn 
  <a href="https://sundial.gennetten.org/docs/AnalemmaIllustrationFromJune1985.pdf" target="_blank" rel="noopener noreferrer">instructional</a>,
  <a href="https://sundial.gennetten.org/docs/SundialIllustrationFromJune1985.pdf" target="_blank" rel="noopener noreferrer">illustrations</a>.
   Here's an example 
  <a href="https://sundial.gennetten.org/docs/Tabloid-sizeDial.pdf" target="_blank" rel="noopener noreferrer">11x17 inch sundial</a>,
 plotted using an 
  <a href="https://www.hpmuseum.net/display_item.php?hw=79" target="_blank" rel="noopener noreferrer">HP9872 plotter</a>.
</p>
<p>The sundial generator now uses the professional-grade 
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
              href="mailto:sundial@gennetten.com?subject=Sundial%20Feedback"
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

