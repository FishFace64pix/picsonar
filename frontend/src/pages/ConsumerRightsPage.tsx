import React from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

/**
 * Consumer Rights page — required by Romanian law OUG 34/2014 which
 * transposes Directive 2011/83/EU on consumer rights.
 *
 * For digital-content services delivered immediately after payment, the
 * 14-day right of withdrawal can be waived — but only if the consumer is
 * explicitly informed in advance AND provides active consent. The
 * /register checkbox captures the consent; this page is the pre-purchase
 * informational disclosure Annex I requires.
 *
 * Do NOT remove without input from a Romanian consumer-protection lawyer.
 */
const ConsumerRightsPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <Navbar />
      <div className="flex-grow pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="glass-panel p-8 md:p-12 animate-fade-in border border-white/10 shadow-2xl">
          <div className="mb-10">
            <h1 className="text-4xl font-black mb-4 text-white uppercase tracking-tight">
              Drepturile Consumatorilor
            </h1>
            <div className="flex items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
              <span>OUG 34/2014</span>
              <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
              <span>Version 1.0</span>
              <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
              <span>Last Updated: 18 April 2026</span>
            </div>
          </div>

          <div className="space-y-10 text-gray-300">
            <section>
              <h2 className="text-xl font-bold text-white mb-4">
                1. Cine suntem
              </h2>
              <p>
                PicSonar SRL este operatorul serviciului „PicSonar". Datele de
                identificare (CUI, sediu, ONRC, contact) se regăsesc în
                subsolul oricărei pagini și pe{' '}
                <a href="/contact" className="underline hover:text-primary-400">
                  pagina de contact
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">
                2. Dreptul de retragere — regula generală
              </h2>
              <p>
                Conform OUG 34/2014 (art. 9), dacă achiziționați un bun sau un
                serviciu la distanță ori în afara spațiilor comerciale, aveți
                dreptul să vă retrageți în termen de{' '}
                <strong>14 zile calendaristice</strong> de la încheierea
                contractului, fără penalități și fără a justifica motivul.
              </p>
              <p className="mt-3">
                Pentru a vă retrage, ne puteți notifica oricând la{' '}
                <a
                  href="mailto:support@picsonar.com"
                  className="underline hover:text-primary-400"
                >
                  support@picsonar.com
                </a>{' '}
                sau folosind formularul-model de la art. 11 din OUG 34/2014
                (disponibil la cerere).
              </p>
            </section>

            <section className="border border-amber-500/40 rounded-lg p-6 bg-amber-500/5">
              <h2 className="text-xl font-bold text-amber-300 mb-4">
                3. Excepție importantă — livrare imediată de conținut digital
              </h2>
              <p>
                PicSonar oferă <strong>conținut digital</strong> (rezultate de
                recunoaștere facială, acces la galerii de fotografii, facturi
                electronice) care este executat și pus la dispoziție{' '}
                <strong>imediat după plată</strong>.
              </p>
              <p className="mt-3">
                Conform art. 16 lit. (m) din OUG 34/2014, dreptul de retragere
                de 14 zile <strong>nu se aplică</strong> contractelor de
                furnizare de conținut digital livrat altfel decât pe suport
                material, atunci când:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-1 ml-4">
                <li>
                  executarea a început cu acordul prealabil expres al
                  consumatorului; și
                </li>
                <li>
                  consumatorul a confirmat că a luat cunoștință de pierderea
                  dreptului de retragere odată cu începerea executării.
                </li>
              </ul>
              <p className="mt-3">
                La înregistrare (pagina <code>/register</code>), bifați o
                căsuță care formalizează cele două condiții de mai sus. Fără
                bifarea acestei căsuțe, contul nu se poate crea. Timpul exact
                al consimțământului, adresa IP și user-agent-ul sunt
                înregistrate ca probă (conform art. 7 RGPD) și pot fi
                solicitate printr-o cerere de acces la date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">
                4. Rambursări
              </h2>
              <p>
                Dacă dreptul de retragere se aplică (situații în care
                excepția de la punctul 3 nu este incidentă), returnăm sumele
                plătite în termen de maxim <strong>14 zile</strong> de la
                primirea notificării, folosind același mijloc de plată pe care
                l-ați utilizat la achiziție, fără a percepe comisioane
                suplimentare.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">
                5. Conformitate cu contractul și garanție legală
              </h2>
              <p>
                Serviciul trebuie să corespundă descrierii, să funcționeze
                conform specificațiilor publicate și să fie potrivit scopului
                pentru care este folosit în mod obișnuit. În caz contrar aveți
                dreptul la repararea defectului, la rambursare sau la
                reducerea prețului (OUG 140/2021, transpunere directivă
                2019/770/UE pentru conținut digital).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">
                6. Cum depuneți o reclamație
              </h2>
              <p>
                Puteți scrie oricând la{' '}
                <a
                  href="mailto:support@picsonar.com"
                  className="underline hover:text-primary-400"
                >
                  support@picsonar.com
                </a>
                . Vă răspundem în cel mult 5 zile lucrătoare. Dacă răspunsul
                nu vă mulțumește, aveți dreptul să vă adresați:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
                <li>
                  <strong>ANPC</strong> (Autoritatea Națională pentru
                  Protecția Consumatorilor) —{' '}
                  <a
                    href="https://anpc.ro"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-primary-400"
                  >
                    anpc.ro
                  </a>
                </li>
                <li>
                  <strong>SOL / ODR</strong> (platforma europeană de
                  soluționare online a litigiilor) —{' '}
                  <a
                    href="https://ec.europa.eu/consumers/odr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-primary-400"
                  >
                    ec.europa.eu/consumers/odr
                  </a>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">
                7. Modificări
              </h2>
              <p>
                Orice schimbare substanțială a acestui document va fi
                comunicată prin email tuturor utilizatorilor înregistrați cu
                cel puțin 30 de zile înainte de intrarea în vigoare și va fi
                publicată pe această pagină cu o versiune actualizată.
              </p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default ConsumerRightsPage
