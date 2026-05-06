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
      path: '/treasury',
      label: 'Caisse',
      icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-4H9l3-7 3 7h-2v4z M12 6v2',
    },
    {
      path: '/contributions',
      label: 'Cotisations',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
    },
    {
      path: '/projects',
      label: 'Projets',
      icon: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z',
    },
  ];

  visibleItems = computed(() => {
    const role = this.auth.userRole();
    return this.allItems.filter(
      (item) => !item.roles || (role && item.roles.includes(role))
    );
  });
}
