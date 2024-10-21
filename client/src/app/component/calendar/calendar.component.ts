import { DatePipe, NgClass } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TrackerService } from '../../services/tracker.service';
import { MeditationI, MeditationType } from '../../interfaces/interfaces';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [DatePipe, NgClass, FormsModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css',
})
export class CalendarComponent implements OnInit {
  diasMeditados: Set<string> = new Set();
  selectedMeditation: undefined | any | void = [];
  myTracking = [];
  editMode = false;

  //Calendar
  currentMonth: Date = new Date();
  daysInMonth!: any;

  // Guardar el mes y año actuales
  actualMonth: number = new Date().getMonth();
  actualYear: number = new Date().getFullYear();
  actualDay: number = new Date().getDate();
  selectedDate: any;

  //dialog
  isVisible: boolean = false;

  meditation: MeditationI = {
    duration: 0,
    type: MeditationType.Vipassana,
    notes: '',
    date: Date.now(),
  };

  constructor(
    private cdr: ChangeDetectorRef,
    private trackerService: TrackerService
  ) {}
  ngOnInit(): void {
    this.updateDaysInMonth();
    this.getTracking();
  }

  getTracking() {
    this.trackerService.getAllTrack().subscribe((value) => {
      this.myTracking = value;
      this.selectDate({ day: this.actualDay, monthType: 'current' });
      this.initializePaseoDates();
    });
  }

  isCurrentMonth(): boolean {
    return (
      this.currentMonth.getMonth() === this.actualMonth &&
      this.currentMonth.getFullYear() === this.actualYear
    );
  }

  isCurrentDay(day: any): boolean {
    return (
      day === this.actualDay &&
      this.currentMonth.getMonth() === this.actualMonth &&
      this.currentMonth.getFullYear() === this.actualYear
    );
  }

  updateDaysInMonth() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const firstDayOfWeek = new Date(year, month, 1).getDay();

    // Días del mes anterior
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const prevMonthDays = Array.from({ length: firstDayOfWeek }, (_, i) => ({
      day: daysInPrevMonth - firstDayOfWeek + i + 1,
      monthType: 'prev',
    }));

    // Días del mes actual
    const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      monthType: 'current',
    }));

    const lastDayOfWeek = new Date(year, month + 1, 0).getDay();

    // Días del mes siguiente
    const nextMonthDays = Array.from({ length: 6 - lastDayOfWeek }, (_, i) => ({
      day: i + 1,
      monthType: 'next',
    }));

    this.daysInMonth = [
      ...prevMonthDays,
      ...currentMonthDays,
      ...nextMonthDays,
    ];
  }

  previousMonth() {
    this.selectedDate = undefined;
    const newDate = new Date(this.currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    this.currentMonth = newDate;
    this.updateDaysInMonth();
    this.cdr.detectChanges();
  }

  nextMonth() {
    this.selectedDate = null;
    const newDate = new Date(this.currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    this.currentMonth = newDate;
    this.updateDaysInMonth();
    this.cdr.detectChanges();
  }

  getPrevMonthDays(): number {
    const firstDayOfWeek = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth(),
      1
    ).getDay();
    return firstDayOfWeek;
  }

  // Determina si el día actual pertenece al mes anterior
  isPrevMonthDay(index: number): boolean {
    return index < this.getPrevMonthDays();
  }

  // Determina si el día actual pertenece al mes siguiente
  isNextMonthDay(index: number): boolean {
    const totalDays =
      this.getPrevMonthDays() +
      this.daysInMonth.filter((day: any) => day > 0 && day <= 31).length;
    return index >= totalDays;
  }

  initializePaseoDates(): void {
    this.diasMeditados.clear();
    this.myTracking?.forEach((update: any) => {
      // Convertir fecha ISO a formato 'yyyy-MM-dd'
      const formattedDate = new Date(update.date).toISOString().split('T')[0];
      this.diasMeditados.add(formattedDate);
    });
  }

  isPaseoDay(day: number): boolean {
    const date = new Date(this.actualYear, this.actualMonth, day);

    const formattedDate = date.toISOString().split('T')[0];
    return this.diasMeditados.has(formattedDate);
  }

  selectDate(dayInfo: any) {
    if (dayInfo.monthType === 'prev') {
      this.previousMonth();
    } else if (dayInfo.monthType === 'next') {
      this.nextMonth();
    } else {
      this.selectedDate = new Date(
        this.actualYear,
        this.actualMonth,
        dayInfo.day
      );
      this.meditation.date = this.selectedDate;
    }
    const selectedDateStr = this.selectedDate.toISOString().split('T')[0]; // 'yyyy-MM-dd'
    this.selectedMeditation = this.myTracking?.filter((update: any) => {
      const itemDateStr = new Date(update.date).toISOString().split('T')[0]; // 'yyyy-MM-dd'
      return itemDateStr === selectedDateStr;
    });
  }

  toggleModal(isVisible: boolean, data?: any) {
    this.isVisible = isVisible;
    if (data) {
      this.editMode = true;
      this.meditation = data;
    }
  }
  toggleEdit() {
    this.editMode = !this.editMode;
  }

  onSubmit() {
    if (this.editMode) {
      // Update existing meditation
      this.trackerService
        .updateMeditation(this.meditation._id as string, this.meditation)
        .subscribe(
          (response) => {
            this.isVisible = false;
            this.toggleEdit();
            this.getTracking();
            this.meditation = {
              duration: 0,
              type: MeditationType.Vipassana,
              notes: '',
              date: Date.now(),
            };
          },
          (error) => {
            console.error('Error updating meditation', error);
          }
        );
    } else {
      // Create new meditation
      this.trackerService.newMeditation(this.meditation).subscribe(
        (response) => {
          this.toggleModal(false);
          this.getTracking();
          this.meditation = {
            duration: 0,
            type: MeditationType.Vipassana,
            notes: '',
            date: Date.now(),
          };
        },
        (error) => {
          console.error('Error creating meditation', error);
        }
      );
    }
  }

  deleteMeditation(id: string) {
    this.trackerService.deleteMeditation(id).subscribe((value) => {
      +this.getTracking();
    });
  }
}
