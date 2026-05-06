import {Component, HostListener, inject, OnInit, signal} from '@angular/core';
import {CommonModule} from "@angular/common";
import {FormBuilder, ReactiveFormsModule, Validators} from "@angular/forms";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {NavbarComponent} from "../../../shared/components/navbar/navbar.component";
import {BottomNavComponent} from "../../../shared/components/bottom-nav/bottom-nav.component";
import {FcfaPipe} from "../../../shared/pipes/fcfa.pipe";
import {ApiService} from "../../../core/services/api.service";
import {ToastService} from "../../../core/services/toast.service";
import {Member, Project} from "../../../shared/models";
import {catchError, of} from "rxjs";

type ActionTab = 'deposit' | 'expense';

@Component({
  selector: 'app-treasurer-actions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NavbarComponent, BottomNavComponent, FcfaPipe],
  templateUrl: './treasurer-actions.component.html',
  styleUrl: './treasurer-actions.component.scss'
})
export class TreasurerActionsComponent implements OnInit {
  private fb     = inject(FormBuilder);
  private api    = inject(ApiService);
  private toast  = inject(ToastService);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  activeTab    = signal<ActionTab>('deposit');
  loading      = signal(false);
  errorMessage = signal('');
  members      = signal<Member[]>([]);
  projects     = signal<Project[]>([]);

  // ── État des dropdowns custom ────────────────────────────────
  openDropdown = signal<string | null>(null);

  // Valeurs sélectionnées (affichage)
  selectedMember  = signal<Member | null>(null);
  selectedMonth   = signal<number>(new Date().getMonth() + 1);
  selectedYear    = signal<number>(new Date().getFullYear());
  selectedProject = signal<Project | null>(null);

  depositForm = this.fb.nonNullable.group({
    member_id:          ['', Validators.required],
    amount:             [null as number | null, [Validators.required, Validators.min(1)]],
    description:        [''],
    contribution_month: [new Date().getMonth() + 1],
    contribution_year:  [new Date().getFullYear()],
  });

  expenseForm = this.fb.nonNullable.group({
    amount:      [null as number | null, [Validators.required, Validators.min(1)]],
    description: ['', [Validators.required, Validators.minLength(5)]],
    project_id:  [''],
  });

  months = [
    { value: 1, label: 'Janvier' }, { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' },    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },     { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' }, { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' },{ value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },{ value: 12, label: 'Décembre' },
  ];

  years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('');
  }

  monthLabel(v: number): string {
    return this.months.find(m => m.value === v)?.label ?? '';
  }

  ngOnInit() {
    const action = this.route.snapshot.queryParamMap.get('action');
    if (action === 'expense') this.activeTab.set('expense');

    this.api.get<Member[]>('/members')
      .pipe(catchError(() => of([] as Member[])))
      .subscribe(m => this.members.set(m));

    this.api.get<Project[]>('/projects')
      .pipe(catchError(() => of([] as Project[])))
      .subscribe(p => this.projects.set(p));
  }

  // ── Gestion dropdowns ────────────────────────────────────────
  toggleDropdown(name: string, e: Event) {
    e.stopPropagation();
    this.openDropdown.set(this.openDropdown() === name ? null : name);
  }

  selectMember(m: Member) {
    this.selectedMember.set(m);
    this.depositForm.patchValue({ member_id: m.id });
    this.openDropdown.set(null);
  }

  selectMonthVal(v: number) {
    this.selectedMonth.set(v);
    this.depositForm.patchValue({ contribution_month: v });
    this.openDropdown.set(null);
  }

  selectYearVal(v: number) {
    this.selectedYear.set(v);
    this.depositForm.patchValue({ contribution_year: v });
    this.openDropdown.set(null);
  }

  selectProject(p: Project | null) {
    this.selectedProject.set(p);
    this.expenseForm.patchValue({ project_id: p?.id ?? '' });
    this.openDropdown.set(null);
  }

  @HostListener('document:click')
  closeAllDropdowns() { this.openDropdown.set(null); }

  // ── Helpers ──────────────────────────────────────────────────
  switchTab(tab: ActionTab) { this.activeTab.set(tab); this.errorMessage.set(''); }

  isDepositInvalid(field: string): boolean {
    const ctrl = this.depositForm.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  isExpenseInvalid(field: string): boolean {
    const ctrl = this.expenseForm.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  submitDeposit() {
    if (this.depositForm.invalid) { this.depositForm.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMessage.set('');
    const { member_id, amount, description, contribution_month, contribution_year } = this.depositForm.getRawValue();
    const body: Record<string, unknown> = { member_id, amount, contribution_month, contribution_year };
    if (description.trim()) body['description'] = description.trim();

    this.api.post('/treasury/deposit', body).subscribe({
      next: () => {
        this.toast.success('Cotisation enregistrée avec succès !');
        this.loading.set(false);
        this.router.navigate(['/treasury']);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message ?? 'Une erreur est survenue.');
        this.loading.set(false);
      },
    });
  }

  submitExpense() {
    if (this.expenseForm.invalid) { this.expenseForm.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMessage.set('');
    const { amount, description, project_id } = this.expenseForm.getRawValue();
    const body: Record<string, unknown> = { amount, description };
    if (project_id) body['project_id'] = project_id;

    this.api.post('/treasury/expense', body).subscribe({
      next: () => {
        this.toast.success('Dépense enregistrée avec succès !');
        this.loading.set(false);
        this.router.navigate(['/treasury']);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message ?? 'Une erreur est survenue.');
        this.loading.set(false);
      },
    });
  }
}
