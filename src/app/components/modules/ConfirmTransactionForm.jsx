import React, { useState, useCallback } from 'react';
import { connect } from 'react-redux';
import tt from 'counterpart';

import { findParent } from 'app/utils/DomUtils';
import * as transactionActions from 'app/redux/TransactionReducer';
import useOutsideClick from 'hooks/useOutsideClick';

const ConfirmTransactionForm = (props) => {
    const {
        confirm, confirmBroadcastOperation, warning, checkbox,
        okClick, onCancel, confirmErrorCallback,
    } = props;
    const [checkboxChecked, setCheckboxChecked] = useState(false);
    const conf = typeof confirm === 'function' ? confirm() : confirm;

    const handleCancelClick = useCallback(() => {
        if (confirmErrorCallback) confirmErrorCallback();
        if (onCancel) onCancel();
    }, [confirmErrorCallback, onCancel]);

    const closeOnOutsideClick = useCallback((e) => {
        const inside_dialog = findParent(e.target, 'ConfirmTransactionForm');
        if (!inside_dialog) handleCancelClick();
    }, [handleCancelClick]);

    const formRef = useOutsideClick(closeOnOutsideClick);

    const handleOkClick = useCallback(() => {
        okClick(confirmBroadcastOperation);
    }, [okClick, confirmBroadcastOperation]);

    const handleCheckboxChange = useCallback((e) => {
        setCheckboxChecked(e.target.checked);
    }, []);

    return (
        <div ref={formRef} className="ConfirmTransactionForm">
            <h4>{typeName(confirmBroadcastOperation)}</h4>
            <hr />
            <div>{conf}</div>
            {warning && (
                <div style={{ paddingTop: 10, fontWeight: 'bold' }} className="error">
                    {warning}
                </div>
            )}
            {checkbox && (
                <div>
                    <label htmlFor="checkbox">
                        <input id="checkbox" type="checkbox" checked={checkboxChecked} onChange={handleCheckboxChange} />
                        {checkbox}
                    </label>
                </div>
            )}
            <br />
            <button type="button" className="button" onClick={handleOkClick} disabled={!(checkbox === undefined || checkboxChecked)}>
                {tt('g.ok')}
            </button>
            <button type="button" className="button hollow" onClick={handleCancelClick}>
                {tt('g.cancel')}
            </button>
        </div>
    );
};

const typeName = (confirmBroadcastOperation) => {
    const title = confirmBroadcastOperation.getIn(['operation', '__config', 'title']);
    if (title) return title;
    const type = confirmBroadcastOperation.get('type');
    return tt('confirmtransactionform_jsx.confirm', {
        transactionType: type
            .split('_')
            .map((n) => n.charAt(0).toUpperCase() + n.substring(1))
            .join(' '), // @todo we should translate each potential transaction type!
    });
};

export default connect(
    // mapStateToProps
    (state) => {
        const confirmBroadcastOperation = state.transaction.get('confirmBroadcastOperation');
        const confirmErrorCallback = state.transaction.get('confirmErrorCallback');
        const confirm = state.transaction.get('confirm');
        const warning = state.transaction.get('warning');
        const checkbox = state.transaction.get('checkbox');
        return {
            confirmBroadcastOperation,
            confirmErrorCallback,
            confirm,
            warning,
            checkbox,
        };
    },
    // mapDispatchToProps
    (dispatch) => ({
        okClick: (confirmBroadcastOperation) => {
            dispatch(transactionActions.hideConfirm());
            dispatch(
                transactionActions.broadcastOperation({
                    ...confirmBroadcastOperation.toJS(),
                })
            );
        },
    })
)(ConfirmTransactionForm);
