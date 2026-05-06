import {Component, Input} from '@angular/core';
import {ContributionStatus, MemberStatus, ProjectStatus, Role} from "../../models";

type BadgeVariant =
  | 'success' | 'warning' | 'error' | 'info' | 'neutral'
  | Role | MemberStatus | ContributionStatus | ProjectStatus;

const VARIANT_MAP: Record<string, string> = {
  // Rôles
  admin:     'info',
  treasurer: 'warning',
  manager:   'info',
  member:    'neutral',
  // Statuts membres
  active:    'success',
  pending:   'warning',
  inactive:  'neutral',
  suspended: 'error',
  // Cotisations
  confirmed: 'success',
  declared:  'warning',
  late:      'error',
  // Projets
  in_progress: 'info',
  draft:       'neutral',
  completed:   'success',
  cancelled:   'error',
};

const LABEL_MAP: Record<string, string> = {
  admin:       'Admin',
  treasurer:   'Comptable',
  manager:     'Gestionnaire',
  member:      'Membre',
  active:      'Actif',
  pending:     'En attente',
  inactive:    'Inactif',
  suspended:   'Suspendu',
  confirmed:   'Confirmée',
  declared:    'Déclarée',
  late:        'En retard',
  in_progress: 'En cours',
  draft:       'Brouillon',
  completed:   'Terminé',
  cancelled:   'Annulé',
};

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [],
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.scss'
})
export class BadgeComponent {
  @Input() variant: BadgeVariant = 'neutral';
  @Input() label = '';
  @Input() dot = false;

  resolvedVariant(): string {
    return VARIANT_MAP[this.variant] ?? this.variant;
  }

  resolvedLabel(): string {
    return this.label || LABEL_MAP[this.variant] || this.variant;
  }
}
