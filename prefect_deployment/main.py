import datetime
from enum import StrEnum
import json
import os
import random
import pathlib
import time
import typing
from pydantic import BaseModel, ConfigDict
from prefect import task, get_run_logger, flow
from prefect import Flow, State
from prefect.client.schemas import FlowRun

@flow(name='pep_alert_close')
def flow_one():
    logger = get_run_logger()
    r = random.randint(2, 2000000)
    time.sleep(random.randint(4, 20))
    logger.info(f'int: {r}')
    return r

@flow(name='us_demarket_amlro')
def flow_two():
    logger = get_run_logger()
    r = random.randint(2, 2000000)
    time.sleep(random.randint(2, 10))
    logger.info(f'int: {r}')
    return r

@flow(name='eclerx_gen2')
def flow_three():
    logger = get_run_logger()
    r = random.randint(2, 2000000)
    time.sleep(random.randint(1000, 4000))
    logger.info(f'int: {r}')
    return r

@flow(name='ca_case_creation')
def flow_four():
    logger = get_run_logger()
    r = random.randint(2, 2000000)
    logger.info(f'int: {r}')
    time.sleep(random.randint(20, 30))
    return r

@flow(name='nr_alerts')
def flow_five():
    logger = get_run_logger()
    r = random.randint(2, 2000000)
    time.sleep(random.randint(120, 5000))
    logger.info(f'int: {r}')
    return r

@flow(name='tm_rfi')
def flow_six():
    logger = get_run_logger()
    r = random.randint(2, 2000000)
    time.sleep(random.randint(13, 50))
    logger.info(f'int: {r}')
    return r

class NrVersion(StrEnum):
    nr7 = 'nr7'
    nr9 = 'nr9'


@flow(
    retries=1,
    log_prints=True,
)
def main_flow(
    version: typing.Literal['nr9', 'nr7'], 
    todays_date = datetime.date.today(),
):
    logger = get_run_logger()
    
    version = NrVersion[version]

    logger.info(f'version: {version}')
    logger.info(f'todays_date: {todays_date}')

    fte_items = random.randint(60, 150)
    time.sleep(fte_items)

    logger.info(f"fte_items={fte_items}")

    for i in range(100):
        logger.info(f'logging deployment: {i}')

    if version == 'nr7':
        logger.info(f'nr7 specific logic: {version}')

    elif version == 'nr9':
        logger.info(f'nr9 specific logic: {version}')
    else:
        raise Exception(f'error: {version}')
    return True

def main_flow_on_completion(
    flow: Flow,
    flow_run: FlowRun,
    state: State,
) -> None:
    logger = get_run_logger()

    # print(flow_run.model_dump().keys())
    # print(state.model_dump().keys())
    # print(state.state_details.model_dump())

    # flow_run_d = json.loads(json.dumps(flow_run.model_dump(mode="json"), indent=4))
    # flow_run_d = json.loads(json.dumps(flow_run.model_dump(mode="json"), indent=4))

    # start_time = 
    run_time = flow_run.total_run_time
    how_late = flow_run.estimated_start_time_delta
    params = ''.join([f'{k}: {v}' for k, v in flow_run.parameters.items()])
    logger.info(
        'PASS'
        '\n\n'
        f'flow completed: flow={flow.name}, '
        '\n\n'
        f'runtime: {run_time}, '
        '\n\n'
        f'late: {how_late}, '
        '\n\n'
        f'run_id={getattr(flow_run, "id", "unknown")}, '
        '\n\n'
        f'state={getattr(state, "type", state)}'
        '\n\n'
        f'{params}'
        # f'flow_run model_dump: {flow_run.model_dump()}'
        '\n\n'
        f'state.data: {state.data}'
    )
    logger.info(
        "flow_run:\n%s",
        json.dumps(flow_run.model_dump(mode="json"), indent=4)
    )
    logger.info(
        "state:\n%s",
        # flow_run_d,
        json.dumps(state.model_dump(mode="json"), indent=4)
    )


# @main_flow.on_failure
def on_failure(
    flow: Flow,
    flow_run: FlowRun,
    state: State,
) -> None:
    logger = get_run_logger()
    
    scheduled_start = flow_run.expected_start_time

    # logger.error(
    #     'FAIL'
    #     '\n\n'
    #     f'flow failed: flow={flow.name}, run_id={getattr(flow_run, "id", "unknown")}, '
    #     '\n\n'
    #     f'state={getattr(state, "type", state)}'
    #     '\n\n'
    #     f'FLOW: {repr(flow)}'
    #     '\n\n'
    #     f'STATE: {repr(state)}'
    # )
    msg = (
        f"Your job {flow_run.name} entered state {state.name} "
        f"with message:"
        "\n\n"
        f"http://localhost:4200/runs/flow-run/{flow_run.id}"
        f"Tags: {flow_run.tags}\n\n"
        f"Scheduled start: {scheduled_start}"
    )
    logger.error(msg)


main_flow = main_flow.with_options(
    on_completion=[main_flow_on_completion],
    on_failure=[on_failure],
)


def deploy(
    func: Flow,
    deployment_name: str,
    description: str,
    tags: list[str] | None = None,
    cron: str = '0 5-22 * * 1-5',
    parameters: dict = {}
):
    here = pathlib.Path(__file__).parent
    entrypoint_callable = func.fn.__name__
    entrypoint_path = pathlib.Path(__file__).name

    print(f'entrypoint_path: {entrypoint_path}')

    id: Flow = func.from_source(
        source=str(here),
        entrypoint=f'{entrypoint_path}:{entrypoint_callable}',
    ).deploy(
        name=deployment_name,
        description=description,
        tags=tags,
        cron=cron,
        parameters=parameters,
        work_pool_name='local-pool',
    )
    return id

if __name__ == "__main__":
    every_2_min = '*/2 * * * *'
    every_1_min = '* * * * *'
    every_9_min = '*/9 * * * *'

    deploy(main_flow, 'main_flow_nr7', 'nr7', cron=every_1_min, parameters={'version': 'nr7'})
    deploy(main_flow, 'main_flow_nr9', 'nr9', cron=every_2_min, parameters={'version': 'nr9'})
    deploy(main_flow, 'pep_alert_close_nr9', 'pep_alert_close for nr9', cron=every_2_min, parameters={'version': 'nr9'})
    deploy(main_flow, 'tm_flow', 'TM Flow', cron=every_2_min, parameters={'version': 'nr9'})
    deploy(main_flow, 'cm_flow', 'CM Flow', cron=every_2_min, parameters={'version': 'nr9'})
    deploy(main_flow, 'fcu_flow', 'FCU Flow', cron=every_2_min, parameters={'version': 'nr9'})

    deploy(flow_one, 'pep_alert_close_nr9_v2', 'Close pep alerts', tags=['tm'], cron='0 06 * * 1-5')
    deploy(flow_one, 'pep_alert_close_1min', 'Close pep alerts every 1 minute', tags=['tm'], cron=every_9_min)
    deploy(flow_one, 'pep_alert_close_nr8', 'Close pep alerts nr8', tags=['tm', 'nr8'], cron='0 06 * * 1-5')

    deploy(flow_one, 'pep_alert_close_test', 'Close pep alerts testing v2222222222222222222222222222222222222222222222222222222222222222222222222222222222222', parameters={'version': 'nr9'}, tags=['tm'], cron=every_9_min)


    deploy(flow_two, 'us_demarket_amlro', 'Close us demarket', parameters={'version': 'nr9'}, cron=every_1_min)
    deploy(flow_two, 'us_demarket_amlro_nr8', 'Close us demarket nr8', parameters={'version': 'nr9'}, cron='0 23 * * 1-6')
    deploy(flow_two, 'us_demarket_amlro_nr9', 'Close us demarket nr9', parameters={'version': 'nr9'}, cron='0 22 * * 1-5')
    deploy(flow_two, 'us_demarket_amlro_test', 'Close us demarket testingaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', parameters={'version': 'nr9'}, cron=every_9_min)


    deploy(flow_three, 'eclerx_gen2', 'eClerx the big one', parameters={'version': 'nr9'}, cron='0 01 * * 1-5')
    deploy(flow_three, 'eclerx_gen2_nr9', 'eClerx the big one for nr9', parameters={'version': 'nr9'}, cron=every_9_min)
    deploy(flow_three, 'eclerx_gen2_test', 'eClerx is large testing', parameters={'version': 'nr9'}, cron=every_9_min)

    deploy(flow_four, 'ca_case_creation', 'Create cases from alerts', parameters={'version': 'nr9'}, cron='0 14 * * 1-5')
    deploy(flow_four, 'ca_case_creation_nr9', 'Create cases from alerts', parameters={'version': 'nr9'}, cron=every_9_min)
    deploy(flow_four, 'us_demarket_amlro_test', 'Close us demarket testing', parameters={'version': 'nr9'}, cron=every_9_min)

    deploy(flow_five, 'nr_alerts_nr8', 'Close netreveal alerts nr8 USA', parameters={'version': 'nr9'}, cron=every_9_min)
    deploy(flow_five, 'nr_alerts_nr9', 'Close netreveal alerts nr9', parameters={'version': 'nr9'}, cron='0 09 * * 1-5')

    deploy(flow_six, 'tm_rfi', 'rm rfi emails', tags=['tm'], parameters={'version': 'nr9'}, cron=every_9_min)
    deploy(flow_six, 'tm_rfi_nr9', 'rm rfi emails nr9', tags=['tm'], parameters={'version': 'nr9'}, cron='0 07 * * 1-5')
    deploy(flow_six, 'tm_rfi_nr8', 'rm rfi emails for nr8', tags=['tm'], parameters={'version': 'nr9'}, cron='0 11 * * 1-7')
    deploy(flow_six, 'tm_rfi_test', 'rm rfi emails for testing', parameters={'version': 'nr9'}, cron=every_9_min)


