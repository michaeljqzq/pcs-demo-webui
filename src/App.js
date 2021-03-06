import React, { Component } from 'react';
import { Charts, ChartContainer, ChartRow, YAxis, LineChart, EventChart } from "react-timeseries-charts";
import { TimeSeries, TimeRange, TimeRangeEvent } from "pondjs";
import logo from './asset/dashboard.svg';
import toilet from './asset/toilet.svg';
import './App.css';

const REFRESH_SPAN_IN_SECONDS = 3;
const HEATING_COLOR = "#f99766";
const USAGE_COLOR = "#bafc80";

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
      events: [],
    }
    for(let d of data) {
      let title = `From ${d.start} to ${d.end}`;
      d1.events.push(new TimeRangeEvent(new TimeRange(new Date(d.start), new Date(d.end)), { name, title }));
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

  historyStyle = (event, state) => {
    let color = event.get('name') === 'heating' ? HEATING_COLOR: USAGE_COLOR;
    switch (state) {
      case "normal":
          return {
              fill: color
          };
      case "hover":
          return {
              fill: color,
              opacity: 0.4
          };
      case "selected":
          return {
              fill: color
          };
  }
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
            <span className="title">Telemetry history</span>
            {this.state.heatingSeries && this.state.usingSeries && <ChartContainer timeRange={timeRange} width={this.refTelemetry ? this.refTelemetry.clientWidth - 40: 800}>
                  <ChartRow height="50">
                      <Charts>
                          <EventChart textOffsetY={24} style={this.historyStyle} series={this.state.heatingSeries} label={e=>e.get('title')} />
                      </Charts>
                  </ChartRow>
                  <ChartRow height="50">
                      <Charts>
                        <EventChart textOffsetY={24} style={this.historyStyle} series={this.state.usingSeries} label={e=>e.get('title')} />
                      </Charts>
                  </ChartRow>
              </ChartContainer>}
              
              <div><div style={{background:HEATING_COLOR}} className="color-indicator"></div>Heating history <div style={{background:USAGE_COLOR}} className="color-indicator"></div>Usage history</div>
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
