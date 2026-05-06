import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContributionOverviewComponent } from './contribution-overview.component';

describe('ContributionOverviewComponent', () => {
  let component: ContributionOverviewComponent;
  let fixture: ComponentFixture<ContributionOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContributionOverviewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ContributionOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
