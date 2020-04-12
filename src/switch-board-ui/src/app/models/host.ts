import { HostStatus } from './host-status';

export interface Host {
    id: number;
    name: string;
    status?: HostStatus;
}