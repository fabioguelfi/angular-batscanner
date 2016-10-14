//

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  ViewChild,
  ViewEncapsulation
} from '@angular/core'

import {LifecycleHooksColors} from './lifecycle_hooks_colors.js'
import * as d3 from 'd3'

//

const itemHeight = 20
const minimalMilliscondToDisplayText = 30
const log = console.log.bind(null, '%cFlamechartComponent%c#', 'color: #c0392b', 'color: #333')

//

export const FlamechartComponent =
Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.Emulated,
  exportAs: 'bdFlamechart',
  host: {
  },
  inputs: [
    'data',
    'transform',
    'height',
    'width'
  ],
  outputs: [
    'zoomEmitter: zoom'
  ],
  queries: {
    flameGroupElement: new ViewChild('flameGroup'),
    axisElement: new ViewChild('axis'),
    zoomElement: new ViewChild('zoom')
  },
  selector: 'g[bd-flamechart]',
  styles: [`
    .zoom {
      cursor: move;
      fill: none;
      pointer-events: all;
    }

    .flame-group /deep/ rect {
      stroke: #EEEEEE;
      fill-opacity: .8;
    }

    .flame-group /deep/ rect:hover {
      stroke: #474747;
      stroke-width: 0.5;
    }

    .flame-group /deep/ .label {
      pointer-events: none;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      font-size: 12px;
      font-family: Verdana;
      margin-left: 4px;
      margin-right: 4px;
      line-height: 1.5;
      padding: 0 0 0;
      font-weight: 400;
      color: black;
      text-align: left;
    }
  `],
  template: `
    <svg:g
     #axis
     class="axis axis--x"
    ></svg:g>
    <svg:rect
     #zoom
     class="zoom"
    ></svg:rect>
    <svg:g
     #flameGroup
     class="flame-group"
    ></svg:g>
  `
})
.Class({
  constructor: [function FlamechartComponent () {
    this.zoomEmitter = new EventEmitter() // .debounceTime(150)
    this.series = []

    this.color = (type) => LifecycleHooksColors[type]
  }],

  ngAfterViewInit () {
    this.initialize()
  },

  ngOnChanges (changes) {
    if (changes.width && this.x) {
      this.x.range([0, this.width])
    }

    if (changes.data && this.data) {
      this.startTime = this.startTime || (this.data[0] || {}).timestamp
      this.endTime = (this.data[this.data.length - 1] || {}).timestamp

      const minmaxdomain = d3.extent([this.startTime, this.endTime])
      this.x.domain(minmaxdomain)

      const IdDepthMap = this.data.reduce((memo, e) => {
        if (Number.isNaN(Number(memo[e.id]))) {
          memo[e.id] = memo.length
          memo.length += 1
        }
        return memo
      }, {length: 0})

      const getDepthFromId = (id) => IdDepthMap[id]
      const newSerie = this.data.map((e) => {
        return Object.assign({}, e, {
          depth: getDepthFromId(e.id)
        })
      })

      this.series = this.series.concat(newSerie)
    }
  },

  ngAfterViewChecked () {
    const flamechartComponentRenderFrame = () => { this.render() }
    window.requestIdleCallback(() => {
      // Scheduling the next render function after the last idle "frame"
      window.requestAnimationFrame(flamechartComponentRenderFrame)
    })
  },

  //

  initialize () {
    this.x = d3.scaleLinear()
      .domain([0, 1000])
      .range([0, this.width])

    //

    this.xAxis = d3.axisBottom(this.x)
      .tickFormat((p) => d3.format('d')(p) + ' ms')
      .tickSizeInner(this.height)
      .tickPadding(5 - this.height)

    //

    this.zoom = d3.zoom()
      .scaleExtent([1, Infinity])
      .translateExtent([[0, 0], [this.width, this.height]])
      .extent([[0, 0], [this.width, this.height]])
      .on('zoom', this._zoomed.bind(this))
  },

  render () {
    const flameChart = (context) => {
      const selection = context.selection ? context.selection() : context

      const flame = selection.selectAll('.flame')
        .data(this.series, (d, i) => i)
      const flameExit = flame.exit()
      const flameEnter = flame.enter()
        .append('g')
        .attr('class', 'flame')

      flameEnter.merge(flame)
        .attr('transform', (d, i) =>
          `translate(${this.x(d.timestamp)}, ${d.depth * itemHeight})`
        )

      flameExit.remove()

      //

      const rect = flame.select('rect')
      const rectEnter = flameEnter.append('rect')

      rectEnter.merge(rect)
        .attr('height', (d) => itemHeight)
        .attr('width', (d) => this.x((d.duration || 1)))
        .attr('fill', (d, i) => this.color(d.type))

      //

      const foreignObject = flame.select('foreignObject')
      const foreignObjectEnter = flameEnter
        .append('foreignObject')

      foreignObjectEnter.merge(foreignObject)
        .attr('height', (d) => itemHeight)
        .attr('width', (d) => this.x((d.duration || 1)))

      //

      const label = foreignObject.select('.label')
      const lableEnter = foreignObjectEnter
        .append('xhtml:div')
        .attr('class', 'label')

      lableEnter.merge(label)
        .style('display', (d) => (
          this.x((d.duration || 1)) < minimalMilliscondToDisplayText)
          ? 'none' : 'block'
        )
        .attr('fill', '#000')
        .text((d) => `${d.type} @ ${d.targetName}`)
    }

    d3.select(this.flameGroupElement.nativeElement)
      .call(flameChart)

    d3.select(this.zoomElement.nativeElement)
      .attr('width', this.width)
      .attr('height', this.height)
      .call(this.zoom)

    d3.select(this.axisElement.nativeElement)
      .call(this.xAxis)
      .selectAll('text')
        .attr('x', '-5')
  },

  renderFlames () {

  },

  //

  _zoomed () {
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'brush') {
      return // ignore zoom-by-brush
    }

    this.zoomEmitter.next(d3.event)
  }
})