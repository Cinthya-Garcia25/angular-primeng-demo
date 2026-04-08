import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GroupsService } from './groups.service';
import { PermissionsService } from './permissions.service';

describe('GroupsService - Group Permissions', () => {
  let service: GroupsService;
  let httpMock: HttpTestingController;
  let permissionsService: jasmine.SpyObj<PermissionsService>;

  beforeEach(() => {
    const permissionsSpy = jasmine.createSpyObj('PermissionsService', ['setGroupPermissions', 'clearGroupPermissions']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        GroupsService,
        { provide: PermissionsService, useValue: permissionsSpy }
      ]
    });

    service = TestBed.inject(GroupsService);
    httpMock = TestBed.inject(HttpTestingController);
    permissionsService = TestBed.inject(PermissionsService) as jasmine.SpyObj<PermissionsService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('loadGroupPermissions', () => {
    it('should load group permissions and update PermissionsService', () => {
      const groupId = 'group-123';
      const mockPermissions = ['ticket:view', 'ticket:add', 'group:edit'];

      // Mock sessionStorage
      spyOn(sessionStorage, 'getItem').and.returnValue(null);

      // Call the method
      service.loadGroupPermissions(groupId);

      // Expect HTTP request
      const req = httpMock.expectOne(`/api/groups/${groupId}/members/me`);
      expect(req.request.method).toBe('GET');
      
      // Respond with mock data
      req.flush({
        statusCode: 200,
        data: [{ permissions: mockPermissions }]
      });

      // Verify PermissionsService was updated
      expect(permissionsService.setGroupPermissions).toHaveBeenCalledWith(mockPermissions);

      // Verify cache was updated
      const cachedPermissions = service.getGroupPermissions(groupId);
      expect(cachedPermissions).toEqual(mockPermissions);
    });

    it('should handle empty permissions', () => {
      const groupId = 'group-456';

      service.loadGroupPermissions(groupId);

      const req = httpMock.expectOne(`/api/groups/${groupId}/members/me`);
      req.flush({
        statusCode: 200,
        data: [{ permissions: [] }]
      });

      expect(permissionsService.setGroupPermissions).toHaveBeenCalledWith([]);
      expect(service.getGroupPermissions(groupId)).toEqual([]);
    });
  });

  describe('hasGroupPermission', () => {
    it('should return true if user has permission in group', () => {
      const groupId = 'group-789';
      const permissions = ['ticket:view', 'ticket:add'];

      // Manually set cache for testing
      service['groupPermissionsCache'].value.set(groupId, permissions);

      expect(service.hasGroupPermission(groupId, 'ticket:view')).toBe(true);
      expect(service.hasGroupPermission(groupId, 'ticket:add')).toBe(true);
      expect(service.hasGroupPermission(groupId, 'group:edit')).toBe(false);
    });

    it('should return false if group not found in cache', () => {
      const groupId = 'non-existent-group';

      expect(service.hasGroupPermission(groupId, 'ticket:view')).toBe(false);
    });
  });

  describe('updateGroupPermissionsCache', () => {
    it('should update cache and PermissionsService if active group', () => {
      const groupId = 'active-group';
      const newPermissions = ['user:view', 'user:edit'];

      // Mock sessionStorage to simulate active group
      spyOn(sessionStorage, 'getItem').and.returnValue(groupId);

      service.updateGroupPermissionsCache(groupId, newPermissions);

      expect(service.getGroupPermissions(groupId)).toEqual(newPermissions);
      expect(permissionsService.setGroupPermissions).toHaveBeenCalledWith(newPermissions);
    });

    it('should update cache but not PermissionsService if not active group', () => {
      const groupId = 'inactive-group';
      const newPermissions = ['group:add'];
      const activeGroupId = 'different-group';

      spyOn(sessionStorage, 'getItem').and.returnValue(activeGroupId);

      service.updateGroupPermissionsCache(groupId, newPermissions);

      expect(service.getGroupPermissions(groupId)).toEqual(newPermissions);
      expect(permissionsService.setGroupPermissions).not.toHaveBeenCalled();
    });
  });

  describe('clearGroupPermissions', () => {
    it('should clear group permissions and update PermissionsService if active group', () => {
      const groupId = 'active-group';

      spyOn(sessionStorage, 'getItem').and.returnValue(groupId);

      // First add some permissions
      service.updateGroupPermissionsCache(groupId, ['ticket:view']);
      expect(service.getGroupPermissions(groupId)).toEqual(['ticket:view']);

      // Then clear them
      service.clearGroupPermissions(groupId);

      expect(service.getGroupPermissions(groupId)).toEqual([]);
      expect(permissionsService.clearGroupPermissions).toHaveBeenCalled();
    });
  });

  describe('loadCurrentGroupPermissions', () => {
    it('should load permissions for current group from sessionStorage', () => {
      const groupId = 'current-group';
      const mockPermissions = ['group:edit'];

      spyOn(sessionStorage, 'getItem').and.returnValue(groupId);

      service.loadCurrentGroupPermissions();

      const req = httpMock.expectOne(`/api/groups/${groupId}/members/me`);
      req.flush({
        statusCode: 200,
        data: [{ permissions: mockPermissions }]
      });

      expect(permissionsService.setGroupPermissions).toHaveBeenCalledWith(mockPermissions);
    });

    it('should do nothing if no group in sessionStorage', () => {
      spyOn(sessionStorage, 'getItem').and.returnValue(null);

      service.loadCurrentGroupPermissions();

      httpMock.expectNone(() => true); // No HTTP requests should be made
      expect(permissionsService.setGroupPermissions).not.toHaveBeenCalled();
    });
  });
});
