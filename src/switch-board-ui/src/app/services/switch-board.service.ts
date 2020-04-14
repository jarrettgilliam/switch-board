import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Host } from "../models/host";
import { catchError, map, tap } from 'rxjs/operators';
import { MessageService } from "../services/message.service";
import { MessageType } from "../enums/message-type";
import { UserPermissions } from '../models/user-permissions';
import { HostStatus } from '../models/host-status';
import { ActionResponse } from '../models/action-response';

@Injectable({
  providedIn: 'root'
})
export class SwitchBoardService {

  baseUrl = "switch-board/api";
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient,
    private messageService: MessageService) { }

  getHosts(): Observable<Host[]> {
    return this.http.get<Host[]>(`${this.baseUrl}/hosts`).pipe(
      catchError(this.handleError<Host[]>('getting hosts', []))
    );
  }

  getUserPermissions(): Observable<UserPermissions> {
    return this.http.get<UserPermissions>(`${this.baseUrl}/user`).pipe(
      catchError(this.handleError<UserPermissions>('getting user permissions', { admin: false }))
    );
  }

  getHostStatus(id: number): Observable<HostStatus> {
    return this.http.get<HostStatus>(`${this.baseUrl}/status/${id}`).pipe(
      catchError(this.handleError<HostStatus>('getting host status', {
        status: 'unknown',
        using: false,
        users: []
      }))
    );
  }

  useHost(id: number): Observable<ActionResponse> {
    return this.http.post<ActionResponse>(`${this.baseUrl}/usehost/${id}`, null).pipe(
      catchError(this.handleError<ActionResponse>('using host', {
        status: 'error'
      }))
    );
  }

  unuseHost(id: number): Observable<ActionResponse> {
    return this.http.post<ActionResponse>(`${this.baseUrl}/unusehost/${id}`, null).pipe(
      catchError(this.handleError<ActionResponse>('unusing host', {
        status: 'error'
      }))
    );
  }

  poweronHost(id: number): Observable<ActionResponse> {
    return this.http.post<ActionResponse>(`${this.baseUrl}/poweron/${id}`, null).pipe(
      catchError(this.handleError<ActionResponse>('powering on host', {
        status: 'error'
      }))
    ); 
  }

  poweroffHost(id: number): Observable<ActionResponse> {
    return this.http.post<ActionResponse>(`${this.baseUrl}/poweroff/${id}`, null).pipe(
      catchError(this.handleError<ActionResponse>('powering off host', {
        status: 'error'
      }))
    ); 
  }

  private handleError<T>(operation, result?: T) {
    return (error: any): Observable<T> => {
      // console.error(error);
      this.messageService.addMessage(`An error occurred ${operation}`, MessageType.Error);
      return of(result as T);
    };
  }
}
