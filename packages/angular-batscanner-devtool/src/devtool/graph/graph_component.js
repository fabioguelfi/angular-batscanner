//

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  ViewChild,
  ViewEncapsulation,
  NgZone
} from '@angular/core'

import {Observable} from 'rxjs/Observable'

import * as d3 from 'd3'

//

const LIKECYCLE_HOOKS = [
  'OnChanges',
  'OnInit',
  'DoCheck',
  'AfterContentInit',
  'AfterContentChecked',
  'AfterViewInit',
  'AfterViewChecked',
  'ngOnDestroy'
]
const itemHeight = 25
const minimalMilliscondToDisplayText = 25

const log = console.log.bind(null, '%cRootSvgGraphComponent%c#', 'color: #1abc9c', 'color: #333')
//

export const RootSvgGraphComponent =
Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.Emulated,
  exportAs: 'bdGraph',
  inputs: [
    'state'
  ],
  queries: {
    flamechart: new ViewChild('flamechart'),
    overview: new ViewChild('overview'),
    svgElement: new ViewChild('rootSvg'),
    tooltipElement: new ViewChild('myTooltip')
  },
  selector: 'bd-graph',
  styles: [`
    :host {
      display: flex;
    }

    svg {
      flex: 1;
    }
  `],
  template: `
    <svg
     #rootSvg
     xmlns="http://www.w3.org/2000/svg"
     version="1.1"
    >
       <g
         #overview="bdOverviewBrush"
         bd-overview-brush
         [data]="state"
         [width]="svgWidth"
         [height]="overviewHeight"
         (brushed)="_onOverviewBushed($event)"
        ></g>

      <g transform='translate(0, 90)'>
        <g
          #flamechart="bdFlamechart"
          bd-flamechart
          [data]="state"
          [width]="svgWidth"
          [height]="flameChartHeight"
          (zoom)="_onFlameChartZoom($event)"
        ></g>
      </g>
    </svg>

    <div class="flame-chart-entry-info" #myTooltip>
    </div>
  `
})
.Class({
  constructor: [ChangeDetectorRef, function RootSvgGraphComponent (ref) {
    this._ref = ref
    this.overviewHeight = 90
  }],

  ngOnInit () {
    Observable.fromEvent(window, 'resize')
      .debounceTime(300)
      .startWith(null)
      .subscribe(() => {
        this._resize()
        this._ref.detectChanges()
      })
  },

  //

  clear () {
    this.flamechart.clear()
    this.overview.clear()
  },

  //

  _onOverviewBushed (event) {
    const s = event.selection || this.overview.x.range()

    this.flamechart.x.domain(s.map(this.overview.x.invert, this.overview.x))
    d3.select(this.flamechart.axisElement.nativeElement)
      .call(this.flamechart.xAxis)

    const zoomTransform = d3.zoomIdentity
      .scale(this.svgWidth / (s[1] - s[0]))
      .translate(-s[0], 0)

    d3.select(this.flamechart.zoomElement.nativeElement)
      .call(this.flamechart.zoom.transform, zoomTransform)

    d3.select(this.flamechart.flameGroupElement.nativeElement)
      .call(this.flamechart.flames.bind(this.flamechart))
  },

  _onFlameChartZoom (event) {
    const t = event.transform

    this.flamechart.x.domain(t.rescaleX(this.overview.x).domain())

    d3.select(this.flamechart.axisElement.nativeElement)
      .call(this.flamechart.xAxis)

    d3.select(this.overview.brushElement.nativeElement)
      .call(
        this.overview.brush.move,
        this.flamechart.x.range().map(t.invertX, t)
      )

    d3.select(this.flamechart.flameGroupElement.nativeElement)
      .call(this.flamechart.flames.bind(this.flamechart))
  },

  _updateRootSVGSize () {
    const svgElement = this.svgElement.nativeElement
    this.svgWidth = svgElement.clientWidth
    this.svgHeight = svgElement.clientHeight

    this.flameChartHeight = this.svgHeight - this.overviewHeight
  },

  _resize () {
    this._updateRootSVGSize()
  }
})
