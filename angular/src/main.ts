import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

import '@phosphor-icons/webcomponents/PhMagnifyingGlass';
import '@phosphor-icons/webcomponents/PhArrowSquareOut';
import '@phosphor-icons/webcomponents/PhArrowsClockwise';
import '@phosphor-icons/webcomponents/PhArrowsSplit';
import '@phosphor-icons/webcomponents/PhBriefcase';
import '@phosphor-icons/webcomponents/PhBuildings';
import '@phosphor-icons/webcomponents/PhBuildingOffice';
import '@phosphor-icons/webcomponents/PhCalendarBlank';
import '@phosphor-icons/webcomponents/PhCheckCircle';
import '@phosphor-icons/webcomponents/PhClock';
import '@phosphor-icons/webcomponents/PhClockUser';
import '@phosphor-icons/webcomponents/PhCoins';
import '@phosphor-icons/webcomponents/PhGlobe';
import '@phosphor-icons/webcomponents/PhGraduationCap';
import '@phosphor-icons/webcomponents/PhHandshake';
import '@phosphor-icons/webcomponents/PhHourglass';
import '@phosphor-icons/webcomponents/PhMapPin';
import '@phosphor-icons/webcomponents/PhMoney';
import '@phosphor-icons/webcomponents/PhSignature';
import '@phosphor-icons/webcomponents/PhTag';
import '@phosphor-icons/webcomponents/PhTrendUp';
import '@phosphor-icons/webcomponents/PhWallet';
import '@phosphor-icons/webcomponents/PhWifiHigh';

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
