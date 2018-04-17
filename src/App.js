import React, { Component } from 'react';
import { Charts, ChartContainer, ChartRow, YAxis, LineChart } from "react-timeseries-charts";
import { TimeSeries, TimeRange } from "pondjs";
import logo from './asset/dashboard.svg';
import toilet from './asset/toilet.svg';
import './App.css';

const REFRESH_SPAN_IN_SECONDS = 3;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      lineChartSpan: 15*60*1000,
      isHeating: false,
      heatingSwitching: true,
      heatingSeries: null,
      usingSeries: null,
    };
  }

  componentDidMount() {
    this.refreshHeatingStatus();
    this.refreshTelemetry();
    this.refreshRules();
    setInterval(this.refreshTelemetry, REFRESH_SPAN_IN_SECONDS*1000);
    setInterval(this.refreshHeatingStatus, REFRESH_SPAN_IN_SECONDS*1000);
    setInterval(this.refreshRules, REFRESH_SPAN_IN_SECONDS*1000);
    // setTimeout(()=>{this.forceUpdate},0);
  }

  refreshHeatingStatus = () => {
    fetch('/heat').then(result=>result.json()).then(result=>{
      this.setState({
        isHeating: result.isHeating,
        heatingSwitching: false,
      });
    });
  }

  refreshTelemetry = () => {
    fetch('/telemetry?span='+this.state.lineChartSpan).then(result=>result.json()).then(result=>{
      this.setState({
        heatingSeries: this.mapTelemetry(result.heating, 'heating'),
        usingSeries: this.mapTelemetry(result.using, 'using'),
      });
    });
  }

  refreshRules = () => {
    fetch('/rule').then(result=>result.json()).then(result=>{
      this.setState({
        rules: result.result
      });
    });
  }

  mapTelemetry = (data, name) => {
    let d1 = {
      name,
      columns: ['time', name],
      points: []
    }
    for(let d of data) {
      d1.points.push([+new Date(d.start), 0]);
      d1.points.push([+new Date(d.start), 1]);
      d1.points.push([+new Date(d.end), 1]);
      d1.points.push([+new Date(d.end), 0]);
    }
    return new TimeSeries(d1);
  }

  toggleHeating = () => {
    if(this.state.heatingSwitching) {
      return;
    }
    let op = !this.state.isHeating ? '1' : '0';
    this.setState({
      heatingSwitching: true
    });
    fetch('/heat?on='+op, {
      method: 'POST'
    }).then(()=>{
      this.refreshHeatingStatus();
    })
  }

  render() {
    let now = new Date();
    let timeRange = new TimeRange([now - this.state.lineChartSpan, now]);
    let indicatorStyle = {};
    if(this.refToilet && this.refToiletContainer) {
      indicatorStyle = {
        top: (this.refToiletContainer.offsetHeight - this.refToilet.offsetHeight) * 0.5 + this.refToilet.offsetHeight * 0.55,
        // Use offsetHeight since original image ratio is 1:1
        left: (this.refToiletContainer.offsetWidth - this.refToilet.offsetHeight) * 0.5 + this.refToilet.offsetHeight * 0.18,
        width: this.refToilet.offsetHeight * 0.65,
        height: this.refToilet.offsetHeight * 0.09,
        display: this.state.isHeating ? 'block': 'none',
      }
    }

    return (
      <div className="App">
        <div className="header header-bar">
          <img className="logo" src={logo} />
          <span className="title">Azure PCS demo</span>
        </div>
        <div className="body">
          <div className="body-left">
            <div className="status">
              <div ref={(input)=>{this.refToiletContainer = input;}} className="display">
                <img ref={(input)=>{this.refToilet = input;}} className="toilet" src={toilet} />
                <div style={indicatorStyle} className="heating-indicator"></div>
              </div>
              <div className="operation">
                <div className="heating-switch" onClick={this.toggleHeating}>
                  <div className={`${this.state.heatingSwitching ? 'heating-switch-indicator-switching' : (this.state.isHeating ? 'heating-switch-indicator-on': 'heating-switch-indicator-off')} heating-switch-indicator`}></div>
                  <div className="heating-switch-text">Heating</div>
                </div>
              </div>
            </div>
            <div className="telemetry" ref={(input)=>{this.refTelemetry = input;}}>
            {this.state.heatingSeries && <ChartContainer timeRange={timeRange} width={this.refTelemetry ? this.refTelemetry.clientWidth - 20: 800}>
                  <ChartRow height="150">
                      <YAxis id="axis1" tickCounts={1} label="Heating" min={this.state.heatingSeries.min()} max={this.state.heatingSeries.max()} width="60" type="linear" format=".2f"/>
                      <Charts>
                          <LineChart axis="axis1" series={this.state.heatingSeries} columns={['heating']} />
                      </Charts>
                  </ChartRow>
              </ChartContainer>}
              {this.state.usingSeries && <ChartContainer timeRange={timeRange} width={this.refTelemetry ? this.refTelemetry.clientWidth - 20: 800}>
                  <ChartRow height="150">
                      <YAxis id="axis1" label="Usage" min={this.state.usingSeries.min()} max={this.state.usingSeries.max()} width="60" type="linear" format=".2f"/>
                      <Charts>
                          <LineChart axis="axis1" series={this.state.usingSeries} columns={['using']}/>
                      </Charts>
                  </ChartRow>
              </ChartContainer>}
              
            </div>
          </div>
          <div className="body-right">
            <div className="rule">
              <div className="title">Rules</div>
              <div className="data">
                {this.state.rules && this.state.rules.map(r=> <Rule key={r.time+r.heating} time={r.time} heating={r.heatingOn}/>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

class Rule extends Component {
  render() {
    return <div className="rule-item">
      <div className="rule-item-time">{this.props.time}</div>
      <div className="rule-item-heating">{this.props.heating?"Heating on":"Heating off"}</div>
    </div>
  }
}

export default App;
