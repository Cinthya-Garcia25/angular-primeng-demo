import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupSelection } from './group-selection';

describe('GroupSelection', () => {
  let component: GroupSelection;
  let fixture: ComponentFixture<GroupSelection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupSelection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupSelection);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
