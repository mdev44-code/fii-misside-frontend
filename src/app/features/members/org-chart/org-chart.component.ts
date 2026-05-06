import {Component, inject, OnInit, signal} from '@angular/core';
import {CommonModule} from "@angular/common";
import {RouterLink} from "@angular/router";
import {NavbarComponent} from "../../../shared/components/navbar/navbar.component";
import {BottomNavComponent} from "../../../shared/components/bottom-nav/bottom-nav.component";
import {ApiService} from "../../../core/services/api.service";
import {OrgChart, OrgChartMember} from "../../../shared/models";
import {catchError, of} from "rxjs";

@Component({
  selector: 'app-org-chart',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, BottomNavComponent],
  templateUrl: './org-chart.component.html',
  styleUrl: './org-chart.component.scss'
})
export class OrgChartComponent implements OnInit {
  private api = inject(ApiService);

  loading  = signal(true);
  orgChart = signal<OrgChart | null>(null);

  groups = [
    { key: 'admin',     label: 'Administrateur',  role: 'admin' },
    { key: 'treasurer', label: 'Comptable',        role: 'treasurer' },
    { key: 'manager',   label: 'Gestionnaire',     role: 'manager' },
    { key: 'member',    label: 'Membres',          role: 'member' },
  ];

  ngOnInit() {
    this.api.get<OrgChart>('/members/org-chart')
      .pipe(catchError(() => of(null as OrgChart | null)))
      .subscribe(chart => {
        this.orgChart.set(chart);
        this.loading.set(false);
      });
  }

  getMembers(key: string): OrgChartMember[] {
    const chart = this.orgChart();
    if (!chart) return [];
    return chart[key as keyof OrgChart] ?? [];
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('');
  }

  totalMembers(): number {
    const chart = this.orgChart();
    if (!chart) return 0;
    return chart.admin.length + chart.treasurer.length + chart.manager.length + chart.member.length;
  }
}
