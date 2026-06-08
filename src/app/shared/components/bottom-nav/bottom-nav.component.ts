import {Component, computed, inject} from '@angular/core';
import {AuthService} from "../../../core/auth/auth.service";
import {RouterLink, RouterLinkActive} from "@angular/router";

interface NavItem {
  path: string;
  label: string;
  icon: string;        // SVG path data
  iconViewBox?: string;
  roles?: string[];    // undefined = tous les rôles
}

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [
    RouterLinkActive,
    RouterLink
  ],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss'
})
export class BottomNavComponent {
  private auth = inject(AuthService);

  private allItems: NavItem[] = [
    {
      path: '/',
      label: 'Accueil',
      icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
    },
    {
      path: '/members',
      label: 'Membres',
      icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    },
    {
      // Caisse / trésorerie → portefeuille
      path: '/treasury',
      label: 'Caisse',
      icon: 'M21 12V7H5a2 2 0 0 1 0-4h14v4 M3 5v14a2 2 0 0 0 2 2h16v-5 M18 12a2 2 0 0 0 0 4h4v-4z',
    },
    {
      // Cotisations → pièces de monnaie (versements des membres)
      path: '/contributions',
      label: 'Cotisations',
      icon: 'M8 8m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0 M18.09 10.37A6 6 0 1 1 10.34 18 M7 6h1v4 M16.71 13.88l.7.71-2.82 2.82',
    },
    {
      // Projets → mallette
      path: '/projects',
      label: 'Projets',
      icon: 'M4 7h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
    },
  ];

  visibleItems = computed(() => {
    const role = this.auth.userRole();
    return this.allItems.filter(
      (item) => !item.roles || (role && item.roles.includes(role))
    );
  });
}
