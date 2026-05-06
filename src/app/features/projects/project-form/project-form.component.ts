import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {CommonModule} from "@angular/common";
import {FormBuilder, ReactiveFormsModule, Validators} from "@angular/forms";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {NavbarComponent} from "../../../shared/components/navbar/navbar.component";
import {BottomNavComponent} from "../../../shared/components/bottom-nav/bottom-nav.component";
import {ApiService} from "../../../core/services/api.service";
import {ToastService} from "../../../core/services/toast.service";
import {Project} from "../../../shared/models";
import {catchError, of} from "rxjs";

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NavbarComponent, BottomNavComponent],
  templateUrl: './project-form.component.html',
  styleUrl: './project-form.component.scss'
})
export class ProjectFormComponent implements OnInit {
  private fb     = inject(FormBuilder);
  private api    = inject(ApiService);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private toast  = inject(ToastService);

  isEdit       = signal(false);
  projectId    = signal<string | null>(null);
  loading      = signal(false);
  loadingData  = signal(false);
  errorMessage = signal('');

  form = this.fb.nonNullable.group({
    title:            ['', [Validators.required, Validators.minLength(3)]],
    description:      [''],
    budget_allocated: [null as number | null, [Validators.min(0)]],
    start_date:       [''],
    end_date:         [''],
  });

  pageTitle = computed(() => this.isEdit() ? 'Modifier le projet' : 'Nouveau projet');
  submitLabel = computed(() => this.isEdit() ? 'Enregistrer les modifications' : 'Créer le projet');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.projectId.set(id);
      this.loadingData.set(true);

      this.api.get<Project>(`/projects/${id}`)
        .pipe(catchError(() => of(null as Project | null)))
        .subscribe(p => {
          if (p) {
            this.form.patchValue({
              title:            p.title,
              description:      p.description ?? '',
              budget_allocated: p.budget_allocated,
              start_date:       p.start_date ? p.start_date.slice(0, 10) : '',
              end_date:         p.end_date   ? p.end_date.slice(0, 10)   : '',
            });
          }
          this.loadingData.set(false);
        });
    }
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMessage.set('');

    const { title, description, budget_allocated, start_date, end_date } = this.form.getRawValue();
    const body: Record<string, unknown> = { title };
    if (description.trim()) body['description'] = description.trim();
    if (budget_allocated !== null) body['budget_allocated'] = budget_allocated;
    if (start_date) body['start_date'] = start_date;
    if (end_date)   body['end_date']   = end_date;

    const request$ = this.isEdit()
      ? this.api.patch<Project>(`/projects/${this.projectId()}`, body)
      : this.api.post<Project>('/projects', body);

    request$.subscribe({
      next: (p) => {
        this.toast.success(this.isEdit() ? 'Projet mis à jour !' : 'Projet créé avec succès !');
        this.loading.set(false);
        this.router.navigate(['/projects', p.id]);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message ?? 'Une erreur est survenue.');
        this.loading.set(false);
      },
    });
  }
}
