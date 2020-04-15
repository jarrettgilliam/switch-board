import { Component, OnInit } from '@angular/core';
import { SwitchBoardService } from "../../services/switch-board.service";
import { Host } from "../../models/host";
import { UserPermissions } from 'src/app/models/user-permissions';
import { MessageService } from 'src/app/services/message.service';
import { MessageType } from 'src/app/enums/message-type';
import { HostStatus } from 'src/app/models/host-status';

@Component({
  selector: 'app-switch-board',
  templateUrl: './switch-board.component.html',
  styleUrls: ['./switch-board.component.css']
})
export class SwitchBoardComponent implements OnInit {

  private static readonly hostRefreshInterval = 10000;

  // binding
  userPermissions: UserPermissions;
  hosts: Host[];
  host: Host;
  usingButtonText: string;
  powerButtonText: string;
  usersBoxText: string;

  // private fields
  private hostTimer: number;

  constructor(
    private switchBoardService: SwitchBoardService,
    private messageService: MessageService) { }

  ngOnInit(): void {
    this.getHosts();
    this.getUserPermissions();
    this.updateScreenText();
  }

  getHosts(): void {
    this.switchBoardService.getHosts().subscribe(hosts => {
      this.hosts = hosts
      if (hosts) {
        this.host = hosts[0];
        this.hostChanged(hosts[0]);
      }
    });
  }

  getUserPermissions(): void {
    this.switchBoardService.getUserPermissions().subscribe(perms => this.userPermissions = perms);
  }

  usingButtonClicked(): void {
    const host = this.host;

    if (!host) {
      return;
    }

    const using = (host.status && host.status.using) || false;

    const observable = using
      ? this.switchBoardService.unuseHost(host.id)
      : this.switchBoardService.useHost(host.id);

    observable.subscribe(response => {
      if (response.status === 'success') {
        this.messageService.addMessage((using ? "Stopped" : "Started") + " using " + host.name, MessageType.Success);
      } else {
        this.messageService.addMessage("Couldn't " + (using ? "stop" : "start") + " using " + host.name, MessageType.Error);
      }

      this.hostChanged(host);
    });
  }

  powerButtonClicked(): void {
    const host = this.host;

    if (!host) {
      return;
    }

    const online = (host.status && host.status.status === 'online');

    const observable = online
      ? this.switchBoardService.poweroffHost(host.id)
      : this.switchBoardService.poweronHost(host.id);

    observable.subscribe(response => {
      if (response.status === 'success') {
        this.messageService.addMessage(`${host.name} powered ${online ? 'off' : 'on'}`, MessageType.Success);
      } else if (response.message) {
        this.messageService.addMessage(response.message, MessageType.Error);
      } else {
        this.messageService.addMessage(`Couldn't power ${online ? 'off' : 'on'} ${host.name}`, MessageType.Error);
      }
    });
  }

  hostChanged(newHost: Host): void {
    window.clearInterval(this.hostTimer);
    this.hosts.filter(h => h !== newHost).forEach(h => delete h.status);

    if (newHost) {
      this.hostTimer = window.setInterval(() => this.updateHostStatus(newHost), SwitchBoardComponent.hostRefreshInterval);
      this.updateHostStatus(newHost);
    }
  }

  private updateHostStatus(host: Host): void {
    this.switchBoardService.getHostStatus(host.id).subscribe(status => {
      host.status = status;
      this.updateScreenText(status);
    });
  }

  private updateScreenText(status?: HostStatus): void {
    if (!status) {
      status = {
        status: 'unknown',
        using: false,
        users: []
      };
    }

    this.usingButtonText = status.using
      ? "Stop Using"
      : "Start Using";

    this.powerButtonText = status.status === 'online'
      ? "Power Off"
      : "Power On";

    this.usersBoxText = status.users.length > 0
      ? "Users: " + status.users.join(", ")
      : "No online users";
  }
}
