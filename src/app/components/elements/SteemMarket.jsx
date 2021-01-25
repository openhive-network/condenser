// eslint-disable-next-line max-classes-per-file
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import { Sparklines, SparklinesLine } from 'react-sparklines';

class Coin extends Component {
    constructor(props) {
        super(props);
        this.onPointMouseMove = this.onPointMouseMove.bind(this);
        this.onPointMouseOut = this.onPointMouseOut.bind(this);
    }

    componentDidMount() {
        // eslint-disable-next-line react/no-find-dom-node,react/no-string-refs
        const node = ReactDOM.findDOMNode(this.refs.coin);
        node.querySelectorAll('circle').forEach((circle) => {
            circle.setAttribute('r', '8');
            circle.style.fillOpacity = 0;
            circle.style.cursor = 'pointer';
            circle.addEventListener('mouseover', this.onPointMouseMove);
        });
        node.querySelectorAll('polyline').forEach((circle) => {
            circle.style.pointerEvents = 'none';
        });
        node.addEventListener('mouseout', this.onPointMouseOut);
    }

    componentWillUnmount() {
        // eslint-disable-next-line react/no-find-dom-node,react/no-string-refs
        const node = ReactDOM.findDOMNode(this.refs.coin);
        node.querySelectorAll('circle').forEach((circle) => {
            circle.removeEventListener('mouseover', this.onPointMouseMove);
        });
        node.removeEventListener('mouseout', this.onPointMouseOut);
    }

    render() {
        const { color, coin } = this.props;
        const symbol = coin.get('symbol');
        const timepoints = coin.get('timepoints');
        const priceUsd = timepoints.last().get('price_usd');
        const pricesUsd = timepoints.map((point) => parseFloat(point.get('price_usd'))).toJS();
        return (
            // eslint-disable-next-line react/no-string-refs
            <div ref="coin" className="coin">
                <div className="chart">
                    <Sparklines data={pricesUsd}>
                        <SparklinesLine
                            color={color}
                            style={{ strokeWidth: 3.0 }}
                            onMouseMove={(e) => {
                                console.log(e);
                            }}
                        />
                    </Sparklines>
                    <div className="caption" />
                </div>
                <div className="coin-label">
                    <span className="symbol">{symbol}</span>
                    {' '}
                    <span className="price">{parseFloat(priceUsd).toFixed(2)}</span>
                </div>
            </div>
        );
    }

    onPointMouseMove(e) {
        // eslint-disable-next-line react/no-find-dom-node,react/no-string-refs
        const node = ReactDOM.findDOMNode(this.refs.coin);
        const caption = node.querySelector('.caption');
        const circle = e.currentTarget;
        const circles = node.querySelectorAll('circle');
        const index = Array.prototype.indexOf.call(circles, circle);
        const { coin } = this.props;
        const points = coin.get('timepoints');
        const point = points.get(index);
        const priceUsd = parseFloat(point.get('price_usd')).toFixed(2);
        const timepoint = point.get('timepoint');
        const time = new Date(timepoint).toLocaleString();
        caption.innerText = `$${priceUsd} ${time}`;
    }

    onPointMouseOut() {
        // eslint-disable-next-line react/no-find-dom-node,react/no-string-refs
        const node = ReactDOM.findDOMNode(this.refs.coin);
        const caption = node.querySelector('.caption');
        caption.innerText = '';
    }
}

class SteemMarket extends Component {
    render() {
        const { steemMarketData } = this.props;
        if (steemMarketData.isEmpty()) {
            return null;
        }
        const topCoins = steemMarketData.get('top_coins');
        const steem = steemMarketData.get('steem');
        const sbd = steemMarketData.get('sbd');

        return (
            <div className="c-sidebar__module">
                <div className="c-sidebar__header">
                    <h3 className="c-sidebar__h3">Coin Marketplace</h3>
                </div>
                <div className="c-sidebar__content">
                    <div className="steem-market">
                        <Coin coin={steem} color="#09d6a8" />
                        <Coin coin={sbd} color="#09d6a8" />
                        {topCoins.map((coin) => (
                            <Coin key={coin.get('name')} coin={coin} color="#788187" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }
}

export default connect(
    // mapStateToProps
    (state, ownProps) => {
        const steemMarketData = state.app.get('steemMarket');
        return {
            ...ownProps,
            steemMarketData,
        };
    },
    // mapDispatchToProps
    () => ({})
)(SteemMarket);
