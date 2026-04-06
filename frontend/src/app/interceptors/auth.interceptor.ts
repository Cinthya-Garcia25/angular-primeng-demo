import { HttpInterceptorFn } from '@angular/common/http';

function readCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const token   = readCookie('auth_token');
    const groupId = sessionStorage.getItem('selectedGroupId');

    let headers = req.headers;
    if (token)   headers = headers.set('Authorization', `Bearer ${token}`);
    if (groupId) headers = headers.set('x-group-id', groupId);

    return next(req.clone({ headers }));
};
