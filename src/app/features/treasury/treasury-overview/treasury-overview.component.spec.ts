import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreasuryOverviewComponent } from './treasury-overview.component';

describe('TreasuryOverviewComponent', () => {
  let component: TreasuryOverviewComponent;
  let fixture: ComponentFixture<TreasuryOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreasuryOverviewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TreasuryOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
